// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MessageHandler<T = any> {
  handle(message: T): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BatchHandler<T = any> {
  handleBatch(messages: T[]): Promise<boolean>;
}
