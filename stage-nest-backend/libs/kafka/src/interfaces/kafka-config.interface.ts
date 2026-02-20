export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  connectionTimeout?: number;
  groupId?: string;
  retry?: { initialRetryTime: number; retries: number };
}

export interface KafkaConsumerConfig extends KafkaConfig {
  batchSize?: number;
  flushInterval?: number;
  fromBeginning?: boolean;
  groupId: string;
}
export interface KafkaMessage<T> {
  headers?: Record<string, string>;
  key?: string;
  partition?: number;
  value: T;
}
