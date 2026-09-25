---
id: sse-notify-decorator
title: "@sseNotify: Real-Time Events from Any Method"
description: >-
  The @sseNotify decorator fires real-time notifications from any service or store method, keeping business logic free of transport code.
sidebar_label: Real-time Decorators
---

# Real-time Entity Decorators

The `@sseNotify` decorator provides a declarative way to trigger real-time notifications on any service or store method. It is highly customizable and decouples your business logic from the notification system.

## Basic Usage

Apply the decorator to a method. After the method executes successfully, an SSE broadcast is triggered.

> [!IMPORTANT]
> This decorator uses the **TC39 Stage 3** syntax and requires **TypeScript 5.x+**. For legacy environments or older frameworks, use manual notification via `SseNotifyRegistry.notify()`.

```typescript
import { sseNotify } from '@awesome-lang-auth/node';

class ProductService {
  @sseNotify({
    topic: 'products',
    event: 'product.created',
  })
  async createProduct(data: any) {
    return await db.products.insert(data);
  }
}
```

## Advanced Customization

You can resolve topics, events, and payloads dynamically based on the method arguments and the result.

### Dynamic Topic & Payload

```typescript
class UserService {
  @sseNotify({
    // Resolve topic from the return value (user object)
    topic: (args, user) => `user:${user.id}`,
    
    // Custom event name
    event: 'profile.updated',
    
    // Transform the payload before sending
    payload: (user) => ({ 
      id: user.id, 
      username: user.username,
      updatedAt: user.updatedAt 
    }),
    
    // Optional tenancy and user context
    tenantId: (user) => user.tenantId,
    userId: (user) => user.id,
  })
  async updateProfile(userId: string, data: any) {
    return await db.users.update(userId, data);
  }
}
```

## How it works

The decorator uses a global `SseNotifyRegistry`. When you initialize `AuthTools` with SSE enabled, it automatically registers its `SseManager` to this registry.

```typescript
// During app boot
const tools = new AuthTools(bus, { sse: true });
// Now all @sseNotify decorators are active!
```

---

## `SseNotifyRegistry` API

The `SseNotifyRegistry` serves as the central dispatcher for SSE notifications. You can use it manually when decorators are not suitable for your environment or logic.

### Static Methods

| Method | Description |
|--------|-------------|
| `setManager(manager: SseManager \| null)` | Sets the active SSE manager. Typically called automatically by `AuthTools`. |
| `notify(topic, event)` | Directly broadcasts an event to the registry. |
| `executeNotify(options, args, result)` | Executes the notification logic manually, mimicking the decorator behavior. |

### Manual Notification Example

If you cannot use decorators, you can trigger notifications manually:

```typescript
import { SseNotifyRegistry } from '@awesome-lang-auth/node';

async function updateSystemSetting(config: any) {
  const result = await db.settings.save(config);
  
  // 🎯 Manual notification
  SseNotifyRegistry.notify('settings', {
    type: 'setting.changed',
    data: result,
    tenantId: config.tenantId
  });

  return result;
}
```

---

## Benefits

1.  **Cleaner Code**: No need to manually call `tools.notify()` inside every method.
2.  **Type-Safe**: Use method arguments and result types in your resolver functions.
3.  **Flexible**: Works on any class method, not just database stores.

## Related

- [Server-Sent Events (SSE)](/docs/advanced/sse) — the transport the decorator drives
- [Scaling SSE across instances with Redis](/docs/advanced/sse-scaling) — decorated events across a cluster
- [AuthEventBus event names](/docs/advanced/auth-event-bus) — the bus decorated methods publish to
- [Outgoing and inbound webhooks](/docs/advanced/webhooks) — forward the same events off-box
