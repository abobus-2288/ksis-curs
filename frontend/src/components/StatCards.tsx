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
    { label: "queues", value: totalQueues, hint: "registered broker lanes" },
    { label: "ready", value: stats?.pending ?? totals.pending, hint: "waiting for consumers" },
    { label: "in flight", value: stats?.processing ?? totals.processing, hint: "inside visibility timeout" },
    {
      label: "delayed/dead",
      value: (stats?.delayed ?? totals.delayed) + (stats?.dead ?? totals.dead),
      hint: "scheduled or exhausted",
    },
  ];

  return (
    <section className="stat-grid" aria-label="Broker statistics">
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
