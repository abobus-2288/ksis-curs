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

function formatValue(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
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
          <span className="eyebrow">Messages</span>
          <h2>Message ledger</h2>
        </div>
        <div className="filter-row">
          <select
            aria-label="Filter status"
            value={filters.status ?? "all"}
            onChange={(event) =>
              onFiltersChange({ ...filters, status: event.target.value as MessageStatus | "all" })
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter priority"
            value={filters.priority ?? "all"}
            onChange={(event) =>
              onFiltersChange({ ...filters, priority: event.target.value as QueuePriority | "all" })
            }
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
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
              <th>Status</th>
              <th>Priority</th>
              <th>Attempts</th>
              <th>Consumer</th>
              <th>Reserved until</th>
              <th>Payload / result</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={7}>No messages match the current filters.</td>
              </tr>
            ) : (
              messages.map((message) => (
                <tr key={message.id}>
                  <td>#{message.id}</td>
                  <td>
                    <span className={`status-pill ${message.status}`}>{message.status}</span>
                  </td>
                  <td>{message.priority}</td>
                  <td>
                    {message.attempts}/{message.max_attempts}
                  </td>
                  <td>{message.consumer_id ?? "-"}</td>
                  <td>{formatValue(message.reserved_until)}</td>
                  <td>
                    <details>
                      <summary>Inspect</summary>
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
