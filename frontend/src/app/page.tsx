"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrokerControls } from "@/components/BrokerControls";
import { ConsumeMessagePanel } from "@/components/ConsumeMessagePanel";
import { MessageTable } from "@/components/MessageTable";
import { PublishMessageForm } from "@/components/PublishMessageForm";
import { QueueList } from "@/components/QueueList";
import { StatCards } from "@/components/StatCards";
import { StatusBanner } from "@/components/StatusBanner";
import { brokerApi } from "@/lib/api";
import type {
  BrokerMessage,
  BrokerStats,
  ConsumedMessageResponse,
  MessageFilters,
  PublishMessageRequest,
  QueueSummary,
} from "@/types/broker";

type BannerTone = "info" | "error" | "success";

export default function Home() {
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [messages, setMessages] = useState<BrokerMessage[]>([]);
  const [stats, setStats] = useState<BrokerStats>();
  const [selectedQueue, setSelectedQueue] = useState<string>();
  const [filters, setFilters] = useState<MessageFilters>({ status: "all", priority: "all" });
  const [consumed, setConsumed] = useState<ConsumedMessageResponse>();
  const [ackToken, setAckToken] = useState("");
  const [banner, setBanner] = useState<{ message: string; tone: BannerTone }>();
  const [isLoading, setIsLoading] = useState(false);

  const selectedQueueSummary = useMemo(
    () => queues.find((queue) => queue.name === selectedQueue),
    [queues, selectedQueue],
  );

  const refreshQueues = useCallback(async () => {
    const [queueList, brokerStats] = await Promise.all([
      brokerApi.listQueues(),
      brokerApi.stats().catch(() => undefined),
    ]);
    setQueues(queueList);
    setStats(brokerStats);
    setSelectedQueue((current) => current ?? queueList[0]?.name);
  }, []);

  const refreshMessages = useCallback(
    async (queueName = selectedQueue) => {
      if (!queueName) {
        setMessages([]);
        return;
      }

      const nextMessages = await brokerApi.listMessages(queueName, filters);
      setMessages(nextMessages);
    },
    [filters, selectedQueue],
  );

  async function runAction(action: () => Promise<void>, success: string) {
    setIsLoading(true);
    try {
      await action();
      setBanner({ message: success, tone: "success" });
    } catch (error) {
      setBanner({
        message: error instanceof Error ? error.message : "Broker request failed",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    runAction(refreshQueues, "Broker dashboard connected.");
  }, [refreshQueues]);

  useEffect(() => {
    refreshMessages().catch((error) => {
      setBanner({
        message: error instanceof Error ? error.message : "Could not load messages",
        tone: "error",
      });
    });
  }, [refreshMessages]);

  async function createQueue(name: string) {
    await runAction(async () => {
      await brokerApi.createQueue({ name });
      await refreshQueues();
      setSelectedQueue(name);
    }, `Queue ${name} created.`);
  }

  async function publishMessage(queueName: string, payload: PublishMessageRequest) {
    await runAction(async () => {
      await brokerApi.publishMessage(queueName, payload);
      await Promise.all([refreshQueues(), refreshMessages(queueName)]);
    }, "Message published for external consumers.");
  }

  async function consumeMessage(consumerId: string, visibilityTimeout: number) {
    if (!selectedQueue) {
      return;
    }

    await runAction(async () => {
      const response = await brokerApi.consumeMessage(selectedQueue, {
        consumer_id: consumerId,
        visibility_timeout: visibilityTimeout,
      });
      setConsumed(response);
      setAckToken(response.ack_token ?? "");
      await Promise.all([refreshQueues(), refreshMessages(selectedQueue)]);
    }, "Consume request completed.");
  }

  async function ackMessage(result: string) {
    const messageId = consumed?.message?.id;
    if (!messageId) {
      return;
    }

    await runAction(async () => {
      await brokerApi.ackMessage(messageId, {
        ack_token: ackToken,
        result: JSON.parse(result || "{}"),
      });
      setConsumed(undefined);
      setAckToken("");
      await Promise.all([refreshQueues(), refreshMessages(selectedQueue)]);
    }, "Message acknowledged as done.");
  }

  async function nackMessage(error: string, requeue: boolean) {
    const messageId = consumed?.message?.id;
    if (!messageId) {
      return;
    }

    await runAction(async () => {
      await brokerApi.nackMessage(messageId, {
        ack_token: ackToken,
        error,
        requeue,
      });
      setConsumed(undefined);
      setAckToken("");
      await Promise.all([refreshQueues(), refreshMessages(selectedQueue)]);
    }, requeue ? "Message requeued for retry." : "Message marked as failed.");
  }

  async function recoverMessages() {
    await runAction(async () => {
      await brokerApi.recover();
      await Promise.all([refreshQueues(), refreshMessages(selectedQueue)]);
    }, "Recovery moved eligible messages back to ready.");
  }

  return (
    <main className="broker-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">HTTP Message Broker</span>
          <h1>Operate queues without Laravel workers.</h1>
          <p>
            Producers publish over HTTP, consumers reserve with visibility timeout, and the broker tracks
            priority, delayed delivery, retries, ack/nack, and recovery.
          </p>
        </div>
        <div className="hero-diagram" aria-label="Producer broker consumer flow">
          <span>Producer</span>
          <b>POST</b>
          <span>Broker</span>
          <b>ACK</b>
          <span>Consumer</span>
        </div>
      </section>

      <StatusBanner
        message={banner?.message}
        tone={banner?.tone}
        onDismiss={() => setBanner(undefined)}
      />

      <StatCards queues={queues} stats={stats} />

      <div className="dashboard-grid">
        <QueueList
          queues={queues}
          selectedQueue={selectedQueue}
          onSelectQueue={setSelectedQueue}
          onCreateQueue={createQueue}
          isLoading={isLoading}
        />

        <div className="workspace-column">
          <div className="queue-context-card">
            <span className="eyebrow">Selected queue</span>
            <h2>{selectedQueueSummary?.name ?? "Choose or create a queue"}</h2>
            <p>
              {selectedQueueSummary
                ? `${selectedQueueSummary.stats.total} messages tracked across lifecycle states.`
                : "The dashboard will hydrate from GET /api/queues when the broker is available."}
            </p>
          </div>

          <div className="two-column-panels">
            <PublishMessageForm
              queueName={selectedQueue}
              onPublish={publishMessage}
              isDisabled={isLoading}
            />
            <ConsumeMessagePanel
              queueName={selectedQueue}
              consumed={consumed}
              ackToken={ackToken}
              onConsume={consumeMessage}
              onAck={ackMessage}
              onNack={nackMessage}
              onTokenChange={setAckToken}
              isDisabled={isLoading}
            />
          </div>

          <MessageTable
            messages={messages}
            filters={filters}
            onFiltersChange={setFilters}
            isLoading={isLoading}
          />

          <BrokerControls
            apiBaseUrl={brokerApi.apiBaseUrl}
            queueName={selectedQueue}
            onRecover={recoverMessages}
            isDisabled={isLoading}
          />
        </div>
      </div>
    </main>
  );
}
