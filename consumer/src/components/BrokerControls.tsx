interface BrokerControlsProps {
  apiBaseUrl: string;
  queueName?: string;
  onRecover: () => void;
  isDisabled?: boolean;
}

export function BrokerControls({
  apiBaseUrl,
  queueName,
  onRecover,
  isDisabled,
}: BrokerControlsProps) {
  const queue = queueName ?? "invoices";
  const publishCurl = `curl -X POST ${apiBaseUrl}/queues/${queue}/messages \\\n  -H 'Content-Type: application/json' \\\n  -d '{"payload":{"event":"invoice.created","id":42},"priority":"high","delay_seconds":0,"max_attempts":3}'`;
  const consumeCurl = `curl -X POST ${apiBaseUrl}/queues/${queue}/messages/consume \\\n  -H 'Content-Type: application/json' \\\n  -d '{"consumer_id":"billing-worker-1","visibility_timeout":45}'`;
  const ackCurl = `curl -X POST ${apiBaseUrl}/messages/{message_id}/ack \\\n  -H 'Content-Type: application/json' \\\n  -d '{"ack_token":"{token_from_consume}","result":{"processed":true}}'`;
  const nackCurl = `curl -X POST ${apiBaseUrl}/messages/{message_id}/nack \\\n  -H 'Content-Type: application/json' \\\n  -d '{"ack_token":"{token_from_consume}","error":"temporary failure","requeue":true}'`;

  return (
    <section className="panel controls-panel">
      <div className="section-heading compact">
        <span className="eyebrow">Операции</span>
        <h2>Восстановление и внешние клиенты</h2>
        <p>Запустите восстановление вручную или скопируйте примеры для сервисов-производителей и потребителей.</p>
      </div>

      <button className="recover-button" disabled={isDisabled} onClick={onRecover} type="button">
        Восстановить отложенные и просроченные сообщения
      </button>

      <div className="curl-grid">
        <CurlBlock title="Публикация producer" command={publishCurl} />
        <CurlBlock title="Резервирование consumer" command={consumeCurl} />
        <CurlBlock title="Подтверждение consumer" command={ackCurl} />
        <CurlBlock title="Ошибка consumer" command={nackCurl} />
      </div>
    </section>
  );
}

function CurlBlock({ title, command }: { title: string; command: string }) {
  return (
    <article className="curl-card">
      <h3>{title}</h3>
      <pre>{command}</pre>
    </article>
  );
}
