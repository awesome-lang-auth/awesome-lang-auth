---
id: sse-scaling
title: Scaling SSE Across Instances with Redis
description: >-
  Broadcast server-sent events across a Kubernetes cluster or several Node instances by backing SseManager with a Redis pub/sub adapter.
sidebar_label: Scaling SSE
---

# Scaling Server-Sent Events

By default, `SseManager` stores active HTTP connections in the server's local memory. In a distributed environment (e.g., Kubernetes cluster or mult-instance deployment), an event broadcast on **Server A** will not reach a user connected to **Server B**.

To solve this, `node-auth` provides a distribution adapter pattern.

## The Solution: ISseDistributor

You can provide an implementation of the `ISseDistributor` interface to synchronize events across instances.

### 1. Implement the Distributor (e.g. Redis)

```typescript
import { ISseDistributor } from 'awesome-node-auth';
import { createClient } from 'redis';

export class RedisSseDistributor implements ISseDistributor {
  private pub = createClient();
  private sub = createClient();

  async publish(topic: string, event: any): Promise<void> {
    await this.pub.publish('sse-channel', JSON.stringify({ topic, event }));
  }

  async subscribe(callback: (topic: string, event: any) => void): Promise<void> {
    await this.sub.subscribe('sse-channel', (message) => {
      const { topic, event } = JSON.parse(message);
      callback(topic, event);
    });
  }
}
```

### 2. Configure AuthTools

Pass the distributor in the `sseOptions`:

```typescript
const tools = new AuthTools(bus, {
  sse: true,
  sseOptions: {
    distributor: new RedisSseDistributor(),
  },
});
```

## How it works

1.  **Broadcast**: When you call `tools.notify('topic', data)`, the manager publishes the event to the distributor instead of just sending it locally.
2.  **Sync**: The distributor sends the message to all instances of your application.
3.  **Local Delivery**: Every instance receives the message via `subscribe()` and forwards it to its own local HTTP connections matching that topic.

This ensures that real-time notifications work seamlessly across your entire cluster.

## Related

- [Server-Sent Events (SSE)](/docs/advanced/sse) — the single-instance basics
- [@sseNotify real-time decorator](/docs/advanced/sse-notify-decorator) — where the events come from
- [AuthTools: telemetry, SSE and webhooks](/docs/advanced/auth-tools) — wiring SSE into the tools system
- [Authentication telemetry and audit trail](/docs/advanced/telemetry) — the other multi-instance concern
