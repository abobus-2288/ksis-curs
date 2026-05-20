import type { PublishMessageRequest, QueuePriority } from "@/types/broker";

interface PublishMessageFormProps {
  queueName?: string;
  onPublish: (queueName: string, payload: PublishMessageRequest) => void;
  isDisabled?: boolean;
}

const starterPayload = JSON.stringify(
  {
    event: "invoice.created",
    invoice_id: 1284,
    amount: 4900,
  },
  null,
  2,
);

export function PublishMessageForm({
  queueName,
  onPublish,
  isDisabled,
}: PublishMessageFormProps) {
  async function handleSubmit(formData: FormData) {
    if (!queueName) {
      return;
    }

    const rawPayload = String(formData.get("payload") ?? "{}");
    const payload = JSON.parse(rawPayload);
    const priority = String(formData.get("priority") ?? "normal") as QueuePriority;
    const delaySeconds = Number(formData.get("delay_seconds") ?? 0);
    const maxAttempts = Number(formData.get("max_attempts") ?? 3);

    onPublish(queueName, {
      payload,
      priority,
      delay_seconds: Number.isFinite(delaySeconds) ? delaySeconds : 0,
      max_attempts: Number.isFinite(maxAttempts) ? maxAttempts : 3,
    });
  }

  return (
    <section className="panel publish-panel">
      <div className="section-heading compact">
        <span className="eyebrow">Producer</span>
        <h2>Publish message</h2>
        <p>Post JSON payloads with priority and optional delay.</p>
      </div>

      <form action={handleSubmit} className="stacked-form">
        <label>
          Payload JSON
          <textarea name="payload" defaultValue={starterPayload} rows={8} />
        </label>

        <div className="form-grid">
          <label>
            Priority
            <select name="priority" defaultValue="normal">
              <option value="high">high</option>
              <option value="normal">normal</option>
              <option value="low">low</option>
            </select>
          </label>
          <label>
            Delay seconds
            <input min="0" name="delay_seconds" type="number" defaultValue="0" />
          </label>
          <label>
            Max attempts
            <input min="1" name="max_attempts" type="number" defaultValue="3" />
          </label>
        </div>

        <button disabled={!queueName || isDisabled} type="submit">
          Publish to {queueName ?? "queue"}
        </button>
      </form>
    </section>
  );
}
