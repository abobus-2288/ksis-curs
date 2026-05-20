import type {
  AckMessageRequest,
  BrokerMessage,
  BrokerStats,
  ConsumedMessageResponse,
  ConsumeMessageRequest,
  CreateQueueRequest,
  MessageFilters,
  NackMessageRequest,
  PublishMessageRequest,
  QueueSummary,
} from "@/types/broker";

const configuredApiUrl =
  process.env.NEXT_PUBLIC_BROKER_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, "").replace(/\/api$/, "") + "/api"
  : "http://localhost:8000/api";

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as ApiEnvelope<T> | T) : undefined;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }

  return body as T;
}

function buildQuery(filters: MessageFilters): string {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.priority && filters.priority !== "all") {
    params.set("priority", filters.priority);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export const brokerApi = {
  apiBaseUrl: API_BASE_URL,

  listQueues: () => request<QueueSummary[]>("/queues"),

  createQueue: (payload: CreateQueueRequest) =>
    request<QueueSummary>("/queues", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateQueue: (queueName: string, paused: boolean) =>
    request<QueueSummary>(`/queues/${encodeURIComponent(queueName)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: paused ? "paused" : "active" }),
    }),

  listMessages: (queueName: string, filters: MessageFilters = {}) =>
    request<BrokerMessage[]>(
      `/queues/${encodeURIComponent(queueName)}/messages${buildQuery(filters)}`,
    ),

  publishMessage: (queueName: string, payload: PublishMessageRequest) =>
    request<BrokerMessage>(`/queues/${encodeURIComponent(queueName)}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  consumeMessage: (queueName: string, payload: ConsumeMessageRequest) =>
    request<ConsumedMessageResponse>(
      `/queues/${encodeURIComponent(queueName)}/messages/consume`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  ackMessage: (messageId: string | number, payload: AckMessageRequest) =>
    request<BrokerMessage>(`/messages/${encodeURIComponent(messageId)}/ack`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  nackMessage: (messageId: string | number, payload: NackMessageRequest) =>
    request<BrokerMessage>(`/messages/${encodeURIComponent(messageId)}/nack`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  recover: () =>
    request<BrokerStats>("/broker/recover", {
      method: "POST",
    }),

  stats: () => request<BrokerStats>("/broker/stats"),
};
