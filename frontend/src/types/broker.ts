export type QueuePriority = "high" | "normal" | "low";

export type QueueStatus = "active" | "paused" | "deleted";

export type MessageStatus =
  | "pending"
  | "delayed"
  | "processing"
  | "done"
  | "failed"
  | "dead";

export type JsonPayload =
  | string
  | number
  | boolean
  | null
  | JsonPayload[]
  | { [key: string]: JsonPayload };

export interface QueueStats {
  total: number;
  pending: number;
  delayed: number;
  processing: number;
  done: number;
  failed: number;
  dead: number;
}

export interface QueueSummary {
  id?: number | string;
  name: string;
  status: QueueStatus;
  paused?: boolean;
  stats: QueueStats;
  created_at?: string;
  updated_at?: string;
}

export interface BrokerStats extends QueueStats {
  queues: number;
  recovered?: number;
}

export interface BrokerMessage {
  id: number | string;
  queue_name: string;
  payload: JsonPayload;
  priority: QueuePriority;
  status: MessageStatus;
  attempts: number;
  max_attempts: number;
  delay_seconds?: number | null;
  available_at?: string | null;
  reserved_until?: string | null;
  consumer_id?: string | null;
  result?: JsonPayload | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConsumedMessageResponse {
  message: BrokerMessage | null;
  ack_token?: string;
  empty?: boolean;
}

export interface CreateQueueRequest {
  name: string;
}

export interface PublishMessageRequest {
  payload: JsonPayload;
  priority: QueuePriority;
  delay_seconds?: number;
  max_attempts?: number;
}

export interface ConsumeMessageRequest {
  consumer_id: string;
  visibility_timeout: number;
}

export interface AckMessageRequest {
  ack_token: string;
  result?: JsonPayload;
}

export interface NackMessageRequest {
  ack_token: string;
  error?: string;
  requeue: boolean;
}

export interface MessageFilters {
  status?: MessageStatus | "all";
  priority?: QueuePriority | "all";
}

export interface BrokerSnapshot {
  queues: QueueSummary[];
  stats?: BrokerStats;
  messages: BrokerMessage[];
}
