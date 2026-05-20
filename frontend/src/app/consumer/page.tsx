"use client";

import { useState } from "react";
import { StatusBanner } from "@/components/StatusBanner";
import { brokerApi } from "@/lib/api";
import type { ConsumedMessageResponse } from "@/types/broker";

type BannerTone = "info" | "error" | "success";

export default function ConsumerPage() {
  const [banner, setBanner] = useState<{ message: string; tone: BannerTone }>();
  const [isLoading, setIsLoading] = useState(false);
  const [consumed, setConsumed] = useState<ConsumedMessageResponse>();
  const [ackToken, setAckToken] = useState("");
  const [queueName, setQueueName] = useState("invoices");

  async function runAction(action: () => Promise<void>, success: string) {
    setIsLoading(true);
    try {
      await action();
      setBanner({ message: success, tone: "success" });
    } catch (error) {
      setBanner({
        message: error instanceof Error ? error.message : "Запрос к брокеру не выполнен.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function consume(formData: FormData) {
    const nextQueueName = String(formData.get("queue") ?? "").trim();
    const consumerId = String(formData.get("consumer_id") ?? "demo-consumer").trim();
    const visibilityTimeout = Number(formData.get("visibility_timeout") ?? 30);

    if (!nextQueueName) {
      setBanner({ message: "Укажите имя очереди.", tone: "error" });
      return;
    }

    await runAction(async () => {
      const response = await brokerApi.consumeMessage(nextQueueName, {
        consumer_id: consumerId || "demo-consumer",
        visibility_timeout: Number.isFinite(visibilityTimeout) ? visibilityTimeout : 30,
      });

      setQueueName(nextQueueName);
      setConsumed(response);
      setAckToken(response.ack_token ?? "");
    }, "Запрос на получение сообщения выполнен.");
  }

  async function ack(formData: FormData) {
    const messageId = consumed?.message?.id;
    if (!messageId) {
      return;
    }

    await runAction(async () => {
      await brokerApi.ackMessage(messageId, {
        ack_token: ackToken,
        result: JSON.parse(String(formData.get("result") ?? "{}")),
      });
      setConsumed(undefined);
      setAckToken("");
    }, "Сообщение подтверждено как выполненное.");
  }

  async function nack(formData: FormData) {
    const messageId = consumed?.message?.id;
    if (!messageId) {
      return;
    }

    await runAction(async () => {
      await brokerApi.nackMessage(messageId, {
        ack_token: ackToken,
        error: String(formData.get("error") ?? "ошибка обработки"),
        requeue: formData.get("requeue") === "on",
      });
      setConsumed(undefined);
      setAckToken("");
    }, "Ответ по сообщению отправлен.");
  }

  const message = consumed?.message;

  return (
    <main className="service-shell consumer-service">
      <StatusBanner
        message={banner?.message}
        tone={banner?.tone}
        onDismiss={() => setBanner(undefined)}
      />

      <section className="service-card">
        <div className="service-heading">
          <span className="eyebrow">Consumer service</span>
          <h1>Получение сообщений</h1>
          <p>Минимальный клиент для резервирования сообщения и отправки ack/nack.</p>
        </div>

        <form action={consume} className="form-grid consume-grid service-form">
          <label>
            Очередь
            <input name="queue" value={queueName} onChange={(event) => setQueueName(event.target.value)} />
          </label>
          <label>
            ID потребителя
            <input name="consumer_id" defaultValue="billing-worker-1" />
          </label>
          <label>
            Таймаут видимости
            <input min="5" name="visibility_timeout" type="number" defaultValue="30" />
          </label>
          <button disabled={isLoading} type="submit">
            {isLoading ? "Получаем..." : "Получить сообщение"}
          </button>
        </form>

        <div className="service-result-card message-preview">
          {message ? (
            <>
              <span className="eyebrow">Сообщение #{message.id}</span>
              <pre>{JSON.stringify(message.payload, null, 2)}</pre>
              <label>
                Ack токен
                <input
                  value={ackToken}
                  onChange={(event) => setAckToken(event.target.value)}
                  placeholder="токен из ответа consume"
                />
              </label>
            </>
          ) : (
            <p>{consumed?.empty ? "Очередь сейчас пуста." : "Сообщение ещё не получено."}</p>
          )}
        </div>

        <div className="ack-grid">
          <form action={ack} className="stacked-form subtle-form">
            <label>
              Результат JSON
              <textarea name="result" rows={4} defaultValue={'{"ok":true}'} />
            </label>
            <button disabled={!message || !ackToken || isLoading} type="submit">
              Ack: успешно
            </button>
          </form>

          <form action={nack} className="stacked-form subtle-form">
            <label>
              Ошибка
              <textarea name="error" rows={4} defaultValue="ошибка обработки" />
            </label>
            <label className="checkbox-row">
              <input name="requeue" type="checkbox" defaultChecked />
              Вернуть в очередь для новой попытки
            </label>
            <button disabled={!message || !ackToken || isLoading} type="submit">
              Nack: ошибка
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
