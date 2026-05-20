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
import { createBrokerRealtime, type BrokerStateUpdatedEvent } from "@/lib/realtime";
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
        message: error instanceof Error ? error.message : "Запрос к брокеру не выполнен",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    runAction(refreshQueues, "Панель брокера подключена.");
  }, [refreshQueues]);

  useEffect(() => {
    refreshMessages().catch((error) => {
      setBanner({
        message: error instanceof Error ? error.message : "Не удалось загрузить сообщения",
        tone: "error",
      });
    });
  }, [refreshMessages]);

  useEffect(() => {
    let isMounted = true;

    try {
      const echo = createBrokerRealtime();
      echo.channel("broker").listen(".broker.state.updated", (event: BrokerStateUpdatedEvent) => {
        if (!isMounted) {
          return;
        }

        setQueues(event.snapshot.queues);
        setStats(event.snapshot.stats);
        setMessages(event.snapshot.messages);
        setSelectedQueue((current) => current ?? event.snapshot.queues[0]?.name);
      });

      return () => {
        isMounted = false;
        echo.leave("broker");
        echo.disconnect();
      };
    } catch (error) {
      setBanner({
        message: error instanceof Error ? error.message : "Не удалось подключиться к websocket",
        tone: "error",
      });
    }
  }, []);

  async function createQueue(name: string) {
    await runAction(async () => {
      await brokerApi.createQueue({ name });
      setSelectedQueue(name);
    }, `Очередь ${name} создана.`);
  }

  async function publishMessage(queueName: string, payload: PublishMessageRequest) {
    await runAction(async () => {
      await brokerApi.publishMessage(queueName, payload);
    }, "Сообщение опубликовано для внешних потребителей.");
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
    }, "Запрос на получение сообщения выполнен.");
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
    }, "Сообщение подтверждено как выполненное.");
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
    }, requeue ? "Сообщение возвращено в очередь для повтора." : "Сообщение помечено как ошибочное.");
  }

  async function recoverMessages() {
    await runAction(async () => {
      await brokerApi.recover();
    }, "Восстановление вернуло подходящие сообщения в готовые.");
  }

  return (
    <main className="broker-shell">
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
            <span className="eyebrow">Выбранная очередь</span>
            <h2>{selectedQueueSummary?.name ?? "Выберите или создайте очередь"}</h2>
            <p>
              {selectedQueueSummary
                ? `${selectedQueueSummary.stats.total} сообщений отслеживается по состояниям жизненного цикла.`
                : "Панель загрузит данные из GET /api/queues, когда брокер будет доступен."}
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
