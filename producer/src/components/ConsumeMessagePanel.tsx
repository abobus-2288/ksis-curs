import type { ConsumedMessageResponse } from "@/types/broker";

interface ConsumeMessagePanelProps {
  queueName?: string;
  consumed?: ConsumedMessageResponse;
  ackToken: string;
  onConsume: (consumerId: string, visibilityTimeout: number) => void;
  onAck: (result: string) => void;
  onNack: (error: string, requeue: boolean) => void;
  onTokenChange: (token: string) => void;
  isDisabled?: boolean;
}

export function ConsumeMessagePanel({
  queueName,
  consumed,
  ackToken,
  onConsume,
  onAck,
  onNack,
  onTokenChange,
  isDisabled,
}: ConsumeMessagePanelProps) {
  async function consume(formData: FormData) {
    const consumerId = String(formData.get("consumer_id") ?? "demo-consumer");
    const visibilityTimeout = Number(formData.get("visibility_timeout") ?? 30);
    onConsume(consumerId, visibilityTimeout);
  }

  async function ack(formData: FormData) {
    onAck(String(formData.get("result") ?? "{}"));
  }

  async function nack(formData: FormData) {
    onNack(
      String(formData.get("error") ?? "ошибка потребителя"),
      formData.get("requeue") === "on",
    );
  }

  const message = consumed?.message;

  return (
    <section className="panel consume-panel">
      <div className="section-heading compact">
        <span className="eyebrow">Потребитель</span>
        <h2>Получить сообщение</h2>
        <p>Зарезервируйте следующее сообщение и используйте токен для ack или nack.</p>
      </div>

      <form action={consume} className="form-grid consume-grid">
        <label>
          ID потребителя
          <input name="consumer_id" defaultValue="dashboard-consumer-1" />
        </label>
        <label>
          Таймаут видимости
          <input min="5" name="visibility_timeout" type="number" defaultValue="30" />
        </label>
        <button disabled={!queueName || isDisabled} type="submit">
          Получить следующее
        </button>
      </form>

      <div className="consumed-card">
        {message ? (
          <>
            <span className="eyebrow">Зарезервировано сообщение #{message.id}</span>
            <pre>{JSON.stringify(message.payload, null, 2)}</pre>
            <label>
              Ack токен
              <input
                value={ackToken}
                onChange={(event) => onTokenChange(event.target.value)}
                placeholder="токен из ответа consume"
              />
            </label>
          </>
        ) : (
          <p>{consumed?.empty ? "Очередь сейчас пуста." : "Сообщение ещё не зарезервировано."}</p>
        )}
      </div>

      <div className="ack-grid">
        <form action={ack} className="stacked-form subtle-form">
          <label>
            Результат JSON
            <textarea name="result" rows={4} defaultValue={'{"ok":true}'} />
          </label>
          <button disabled={!message || !ackToken || isDisabled} type="submit">
            Подтвердить успех
          </button>
        </form>

        <form action={nack} className="stacked-form subtle-form">
          <label>
            Ошибка
            <textarea name="error" rows={4} defaultValue="внешний сервис вернул ошибку" />
          </label>
          <label className="checkbox-row">
            <input name="requeue" type="checkbox" defaultChecked />
            Вернуть в очередь для новой попытки
          </label>
          <button disabled={!message || !ackToken || isDisabled} type="submit">
            Nack / ошибка
          </button>
        </form>
      </div>
    </section>
  );
}
