"use client";

import { useState } from "react";
import { StatusBanner } from "@/components/StatusBanner";
import { brokerApi } from "@/lib/api";
import type { JsonPayload, QueuePriority } from "@/types/broker";

type BannerTone = "info" | "error" | "success";

const starterPayload = JSON.stringify(
  {
    event: "invoice.created",
    invoice_id: 1284,
    amount: 4900,
  },
  null,
  2,
);

export default function ProducerPage() {
  const [banner, setBanner] = useState<{ message: string; tone: BannerTone }>();
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ id: string | number; queue: string }>();

  async function handleSubmit(formData: FormData) {
    const queueName = String(formData.get("queue") ?? "").trim();
    const rawPayload = String(formData.get("payload") ?? "{}");
    const priority = String(formData.get("priority") ?? "normal") as QueuePriority;
    const delaySeconds = Number(formData.get("delay_seconds") ?? 0);
    const maxAttempts = Number(formData.get("max_attempts") ?? 3);

    if (!queueName) {
      setBanner({ message: "Укажите имя очереди.", tone: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = JSON.parse(rawPayload) as JsonPayload;
      const message = await brokerApi.publishMessage(queueName, {
        payload,
        priority,
        delay_seconds: Number.isFinite(delaySeconds) ? delaySeconds : 0,
        max_attempts: Number.isFinite(maxAttempts) ? maxAttempts : 3,
      });

      setLastMessage({ id: message.id, queue: queueName });
      setBanner({ message: `Сообщение #${message.id} отправлено в ${queueName}.`, tone: "success" });
    } catch (error) {
      setBanner({
        message: error instanceof SyntaxError
          ? "Payload должен быть валидным JSON."
          : error instanceof Error
            ? error.message
            : "Не удалось отправить сообщение.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="service-shell producer-service">
      <StatusBanner
        message={banner?.message}
        tone={banner?.tone}
        onDismiss={() => setBanner(undefined)}
      />

      <section className="service-card">
        <div className="service-heading">
          <span className="eyebrow">Producer service</span>
          <h1>Отправка сообщений</h1>
          <p>Минимальный клиент для публикации payload в выбранную очередь.</p>
        </div>

        <form action={handleSubmit} className="stacked-form service-form">
          <label>
            Очередь
            <input name="queue" placeholder="например invoices" defaultValue="invoices" />
          </label>

          <label>
            Payload JSON
            <textarea name="payload" defaultValue={starterPayload} rows={10} />
          </label>

          <div className="form-grid">
            <label>
              Приоритет
              <select name="priority" defaultValue="normal">
                <option value="high">Высокий</option>
                <option value="normal">Обычный</option>
                <option value="low">Низкий</option>
              </select>
            </label>
            <label>
              Задержка, секунд
              <input min="0" name="delay_seconds" type="number" defaultValue="0" />
            </label>
            <label>
              Максимум попыток
              <input min="1" name="max_attempts" type="number" defaultValue="3" />
            </label>
          </div>

          <button disabled={isLoading} type="submit">
            {isLoading ? "Отправляем..." : "Отправить сообщение"}
          </button>
        </form>

        <div className="service-result-card">
          {lastMessage ? (
            <p>
              Последнее сообщение: <b>#{lastMessage.id}</b> в очереди <b>{lastMessage.queue}</b>
            </p>
          ) : (
            <p>После отправки здесь появится ID последнего сообщения.</p>
          )}
        </div>
      </section>
    </main>
  );
}
