import type { BrokerStats, QueueSummary } from "@/types/broker";

interface StatCardsProps {
  stats?: BrokerStats;
  queues: QueueSummary[];
}

export function StatCards({ stats, queues }: StatCardsProps) {
  const totalQueues = stats?.queues ?? queues.length;
  const totals = queues.reduce(
    (acc, queue) => {
      acc.pending += queue.stats?.pending ?? 0;
      acc.processing += queue.stats?.processing ?? 0;
      acc.delayed += queue.stats?.delayed ?? 0;
      acc.dead += queue.stats?.dead ?? 0;
      return acc;
    },
    { pending: 0, processing: 0, delayed: 0, dead: 0 },
  );

  const cards = [
    { label: "очереди", value: totalQueues, hint: "зарегистрированные каналы" },
    { label: "готово", value: stats?.pending ?? totals.pending, hint: "ждут потребителей" },
    { label: "в работе", value: stats?.processing ?? totals.processing, hint: "внутри visibility timeout" },
    {
      label: "отложено/dead",
      value: (stats?.delayed ?? totals.delayed) + (stats?.dead ?? totals.dead),
      hint: "запланированы или исчерпаны",
    },
  ];

  return (
    <section className="stat-grid" aria-label="Статистика брокера">
      {cards.map((card) => (
        <article className="stat-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.hint}</p>
        </article>
      ))}
    </section>
  );
}
