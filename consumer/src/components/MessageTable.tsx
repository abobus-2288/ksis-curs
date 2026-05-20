import type { BrokerMessage, MessageFilters, MessageStatus, QueuePriority } from "@/types/broker";

interface MessageTableProps {
  messages: BrokerMessage[];
  filters: MessageFilters;
  onFiltersChange: (filters: MessageFilters) => void;
  isLoading?: boolean;
}

const statuses: (MessageStatus | "all")[] = [
  "all",
  "pending",
  "delayed",
  "processing",
  "done",
  "failed",
  "dead",
];

const priorities: (QueuePriority | "all")[] = ["all", "high", "normal", "low"];

const statusLabels: Record<MessageStatus | "all", string> = {
  all: "Все статусы",
  pending: "Ожидает",
  delayed: "Отложено",
  processing: "В обработке",
  done: "Выполнено",
  failed: "Ошибка",
  dead: "Исчерпано",
};

const priorityLabels: Record<QueuePriority | "all", string> = {
  all: "Все приоритеты",
  high: "Высокий",
  normal: "Обычный",
  low: "Низкий",
};

function formatValue(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function MessageTable({
  messages,
  filters,
  onFiltersChange,
  isLoading,
}: MessageTableProps) {
  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="section-heading compact">
          <span className="eyebrow">Сообщения</span>
          <h2>Журнал сообщений</h2>
        </div>
        <div className="filter-row">
          <select
            aria-label="Фильтр по статусу"
            value={filters.status ?? "all"}
            onChange={(event) =>
              onFiltersChange({ ...filters, status: event.target.value as MessageStatus | "all" })
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <select
            aria-label="Фильтр по приоритету"
            value={filters.priority ?? "all"}
            onChange={(event) =>
              onFiltersChange({ ...filters, priority: event.target.value as QueuePriority | "all" })
            }
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="message-table-wrap" aria-busy={isLoading}>
        <table className="message-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Статус</th>
              <th>Приоритет</th>
              <th>Попытки</th>
              <th>Потребитель</th>
              <th>Зарезервировано до</th>
              <th>Payload / результат</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={7}>Нет сообщений под выбранные фильтры.</td>
              </tr>
            ) : (
              messages.map((message) => (
                <tr key={message.id}>
                  <td>#{message.id}</td>
                  <td>
                    <span className={`status-pill ${message.status}`}>{statusLabels[message.status]}</span>
                  </td>
                  <td>{priorityLabels[message.priority]}</td>
                  <td>
                    {message.attempts}/{message.max_attempts}
                  </td>
                  <td>{message.consumer_id ?? "-"}</td>
                  <td>{formatValue(message.reserved_until)}</td>
                  <td>
                    <details>
                      <summary>Открыть</summary>
                      <pre>{JSON.stringify({ payload: message.payload, result: message.result, error: message.error }, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
