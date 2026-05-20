import type { QueueSummary } from "@/types/broker";

interface QueueListProps {
  queues: QueueSummary[];
  selectedQueue?: string;
  onSelectQueue: (queueName: string) => void;
  onCreateQueue: (queueName: string) => void;
  isLoading?: boolean;
}

const statKeys = ["pending", "processing", "done", "dead"] as const;

export function QueueList({
  queues,
  selectedQueue,
  onSelectQueue,
  onCreateQueue,
  isLoading,
}: QueueListProps) {
  async function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (name) {
      onCreateQueue(name);
    }
  }

  return (
    <section className="panel queue-panel">
      <div className="section-heading">
        <span className="eyebrow">Queues</span>
        <h2>Broker lanes</h2>
        <p>Select a queue to inspect, publish, consume, and recover messages.</p>
      </div>

      <form action={handleSubmit} className="create-queue-form">
        <input name="name" placeholder="queue name, e.g. invoices" />
        <button type="submit">Create</button>
      </form>

      <div className="queue-list" aria-busy={isLoading}>
        {queues.length === 0 ? (
          <div className="empty-card">No queues yet. Create one to start the broker demo.</div>
        ) : (
          queues.map((queue) => (
            <button
              className={`queue-card ${selectedQueue === queue.name ? "active" : ""}`}
              key={queue.name}
              onClick={() => onSelectQueue(queue.name)}
              type="button"
            >
              <span className="queue-title-row">
                <strong>{queue.name}</strong>
                <span className={`queue-status ${queue.paused || queue.status === "paused" ? "paused" : "live"}`}>
                  {queue.paused || queue.status === "paused" ? "paused" : "active"}
                </span>
              </span>
              <span className="queue-stats-mini">
                {statKeys.map((key) => (
                  <span key={key}>
                    <b>{queue.stats?.[key] ?? 0}</b>
                    {key}
                  </span>
                ))}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
