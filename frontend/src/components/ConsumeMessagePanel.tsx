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
      String(formData.get("error") ?? "consumer failed"),
      formData.get("requeue") === "on",
    );
  }

  const message = consumed?.message;

  return (
    <section className="panel consume-panel">
      <div className="section-heading compact">
        <span className="eyebrow">Consumer</span>
        <h2>Consume demo</h2>
        <p>Reserve the next message and use the returned token to ack or nack it.</p>
      </div>

      <form action={consume} className="form-grid consume-grid">
        <label>
          Consumer ID
          <input name="consumer_id" defaultValue="dashboard-consumer-1" />
        </label>
        <label>
          Visibility timeout
          <input min="5" name="visibility_timeout" type="number" defaultValue="30" />
        </label>
        <button disabled={!queueName || isDisabled} type="submit">
          Consume next
        </button>
      </form>

      <div className="consumed-card">
        {message ? (
          <>
            <span className="eyebrow">Reserved message #{message.id}</span>
            <pre>{JSON.stringify(message.payload, null, 2)}</pre>
            <label>
              Ack token
              <input
                value={ackToken}
                onChange={(event) => onTokenChange(event.target.value)}
                placeholder="token returned by consume"
              />
            </label>
          </>
        ) : (
          <p>{consumed?.empty ? "Queue is empty right now." : "No message reserved yet."}</p>
        )}
      </div>

      <div className="ack-grid">
        <form action={ack} className="stacked-form subtle-form">
          <label>
            Result JSON
            <textarea name="result" rows={4} defaultValue={'{"ok":true}'} />
          </label>
          <button disabled={!message || !ackToken || isDisabled} type="submit">
            Ack success
          </button>
        </form>

        <form action={nack} className="stacked-form subtle-form">
          <label>
            Error
            <textarea name="error" rows={4} defaultValue="external service failed" />
          </label>
          <label className="checkbox-row">
            <input name="requeue" type="checkbox" defaultChecked />
            Requeue for another attempt
          </label>
          <button disabled={!message || !ackToken || isDisabled} type="submit">
            Nack / fail
          </button>
        </form>
      </div>
    </section>
  );
}
