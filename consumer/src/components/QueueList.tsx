import type { QueueSummary } from "@/types/broker";

interface QueueListProps {
  queues: QueueSummary[];
  selectedQueue?: string;
  onSelectQueue: (queueName: string) => void;
  onCreateQueue: (queueName: string) => void;
  isLoading?: boolean;
}

const statKeys = ["pending", "processing", "done", "dead"] as const;

const statLabels: Record<(typeof statKeys)[number], string> = {
  pending: "ожидает",
  processing: "в работе",
  done: "готово",
  dead: "исчерпано",
};

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
        <span className="eyebrow">Очереди</span>
        <h2>Каналы брокера</h2>
        <p>Выберите очередь, чтобы смотреть, публиковать, получать и восстанавливать сообщения.</p>
      </div>

      <form action={handleSubmit} className="create-queue-form">
        <input name="name" placeholder="имя очереди, например invoices" />
        <button type="submit">Создать</button>
      </form>

      <div className="queue-list" aria-busy={isLoading}>
        {queues.length === 0 ? (
          <div className="empty-card">Очередей пока нет. Создайте первую, чтобы запустить демо брокера.</div>
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
                  {queue.paused || queue.status === "paused" ? "пауза" : "активна"}
                </span>
              </span>
              <span className="queue-stats-mini">
                {statKeys.map((key) => (
                  <span key={key}>
                    <b>{queue.stats?.[key] ?? 0}</b>
                    {statLabels[key]}
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
