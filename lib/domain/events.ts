export type DomainEvent<TPayload = unknown> = {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  actorId: string;
  correlationId: string;
  version: number;
  payload: TPayload;
};

export interface EventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

export class InMemoryEventBus implements EventBus {
  public readonly publishedEvents: DomainEvent<unknown>[] = [];

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    this.publishedEvents.push(event as DomainEvent<unknown>);
  }
}
