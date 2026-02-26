# 🚀 BlinkHub Emitter

<p align="center">
  <strong>Enterprise-grade, type-safe event emitter for modern JavaScript applications</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/blink-hub" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/blink-hub" alt="npm downloads" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-✓-61dafb" alt="React" />
  <img src="https://img.shields.io/badge/Vue-✓-4fc08d" alt="Vue" />
  <img src="https://img.shields.io/badge/Svelte-✓-ff3e00" alt="Svelte" />
  <img src="https://img.shields.io/badge/Node.js-✓-339933" alt="Node.js" />
</p>

BlinkHub is a lightweight, powerful event emitter library that brings enterprise-grade memory management and type safety to any JavaScript environment. Built with TypeScript, it works seamlessly in React, Vue, Svelte, Node.js, and beyond.

## ✨ Why BlinkHub?

- 🎯 **Type-Safe** - Full TypeScript support with strict type checking
- 🔒 **Memory Safe** - Built-in leak detection and automatic warnings
- ⚡ **Zero Dependencies** - Lightweight and fast (< 5KB gzipped)
- 🌍 **Universal** - Works in browser, Node.js, Deno, Bun, React Native
- 🎨 **Framework Agnostic** - Use with React, Vue, Svelte, or vanilla JS
- 🔧 **EventEmitter Compatible** - Drop-in replacement for Node.js EventEmitter
- 📊 **Priority Queues** - Control execution order with listener priorities
- 🎭 **Channels** - Isolated event scopes for better organization
- 🧹 **Easy Cleanup** - Built-in memory management and listener introspection

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
    - [Defining Events and Their Types](#defining-events-and-their-types)
    - [Subscribing to Events](#subscribing-to-events)
    - [Emitting Events](#emitting-events)
    - [Unsubscribing from Events](#unsubscribing-from-events)
- [Advanced Features]()
  - [The `once` method](#the-once-method)
  - [Subscribing to Events with Delay](#subscribing-to-events-with-delay)
  - [Subscribing to Multiple Events](#subscribing-to-multiple-events)
  - [Emitter with Priority](#emitter-with-priority)
  - [Channel-Based Event Handling](#channel-based-event-handling)
  - [Memory Management](#memory-management)
  - [Error Handling](#error-handling)
- [Quick Start Examples](#quick-start-examples)
  - [React: Complete Minimal App](#react-complete-minimal-app)
  - [Vue: Complete Minimal App](#vue-complete-minimal-app)
  - [Svelte: Complete Minimal App](#svelte-complete-minimal-app)
- [Use Case Examples](#use-case-examples)
  - [Simple Notification System](#simple-notification-system)
  - [E-Commerce Cart System](#e-commerce-cart-system)
- [Additional Information](#additional-information)
  - [FAQ for React Developers](#faq-for-react-developers)
  - [Link to React Example](#link-to-react-example)

## Installation

`npm i blink-hub`

## Basic Usage

### Defining Events and Their Types

To use the Emitter, you first need to define the types for your events:

```typescript
type MyEvents = {
  eventName: (arg1: string, arg2: string) => void;
  anotherEvent: (data: number) => void;
};
```

### Subscribing to Events

Now, you can create an instance of the <code>Emitter</code> and subscribe to events:

```typescript
const emitter = new Emitter<MyEvents>();

const unsubscribe = emitter.subscribe('eventName', (arg1: string, arg2: string) => {
    console.log(`Received ${arg1} and ${arg2}`);
});
```

### Emitting Events

You can emit events while ensuring the types of the emitted values match the expected ones:

```typescript
emitter.emit('eventName', 'Hello', 'World'); // Outputs: Received Hello and World
```

### Unsubscribing from Events

To remove a listener from an event:

```typescript
unsubscribe(); // This will remove the callback from the event listeners.
```

### The `once` Method

The `once` method allows listeners to be invoked only once for the specified event. 
After the event has been emitted and the listener invoked, the listener is automatically removed. 
This can be useful for scenarios where you need to react to an event just a single time, rather than every time it's emitted.

```typescript
type UserEvents = {
  userFirstLogin: (username: string) => void;
};

const userEmitter = new Emitter<UserEvents>();

userEmitter.once('userFirstLogin', (username: string): void => {
    console.log(`${username} has logged in for the first time!`);
});

userEmitter.emit('userFirstLogin', 'Alice'); // Outputs: Alice has logged in for the first time!
userEmitter.emit('userFirstLogin', 'Alice'); // No output, as the listener has been removed.

```

#### Note:
If an error occurs within a callback registered with `once`, the callback will not be re-invoked for subsequent events. 
Always handle errors adequately to prevent unforeseen behavior.

### Subscribing to Events with Delay

The `subscribeWithDelay` method allows you to subscribe to an event with a specified delay.
This means the callback function will only be executed after the delay period has passed, following the event emission.

```typescript
const emitter = new Emitter<TestEvents>();

// Subscribe to an event with a delay
const delay = 1000; // Delay in milliseconds (1000ms = 1 second)
emitter.subscribeWithDelay('testEvent', (data: string) => {
    console.log(`Received (after delay): ${data}`);
}, delay);

// Emit the event
emitter.emit('testEvent', 'Delayed Message');
// The callback will be executed after 1 second
```

This is particularly useful in scenarios where you want to defer the execution of an event handler,
such as debouncing user input or delaying a notification.

### Subscribing to Multiple Events
The subscribeList method allows you to subscribe to multiple events at once, providing a convenient way to manage event listeners when you need to react to different events with the same or different callbacks.

Usage
To subscribe to multiple events, pass an object to subscribeList where keys are event names and values are the corresponding callback functions:

```typescript
type UserEvents = {
  userLoggedIn: (username: string) => void;
  userLoggedOut: (username: string) => void;
  userProfileUpdated: (username: string, updateInfo: string) => void;
};

const userEmitter = new Emitter<UserEvents>();

// Subscribe to user-related events
const unsubscribe = userEmitter.subscribeList({
  userLoggedIn: (username: string) => console.log(`${username} logged in`),
  userLoggedOut: (username: string) => console.log(`${username} logged out`),
  userProfileUpdated: (username: string, updateInfo: string) => 
          console.log(`User ${username} updated their profile: ${updateInfo}`)
});

// Emit events based on user activity
userEmitter.emit('userLoggedIn', 'Alice');
userEmitter.emit('userProfileUpdated', 'Alice', 'Changed profile picture');
userEmitter.emit('userLoggedOut', 'Alice');
```
To unsubscribe from the user events:
```typescript
unsubscribe();
```

### Error Handling

If an error occurs within a callback, the emitter will catch it and log it to the console. The emitter also pushes a null value to the results array in case of errors, though this behavior can be customized.

```typescript
emitter.subscribe('eventName', () => {
    throw new Error('Oops!');
});

emitter.emit('eventName', 'Test', 'Error'); // Outputs: Error in callback for event 'eventName'
```

## Quick Start Examples

### React: Complete Minimal App

```tsx
// App.tsx - Complete working example
import { useEffect, useState } from 'react';
import Emitter from 'blink-hub';

// 1. Define your events
type AppEvents = {
  notify: (message: string) => void;
  userAction: (action: string) => void;
};

// 2. Create emitter instance (do this once, outside component)
const appEmitter = new Emitter<AppEvents>();

// 3. Create a listener component
function NotificationDisplay() {
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to events
    const unsubscribe = appEmitter.subscribe('notify', (message) => {
      setNotifications(prev => [...prev, message]);
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  return (
    <div style={{ position: 'fixed', top: 20, right: 20 }}>
      {notifications.map((msg, i) => (
        <div key={i} style={{ 
          background: '#4caf50', 
          color: 'white', 
          padding: '10px 20px',
          margin: '5px 0',
          borderRadius: '4px'
        }}>
          {msg}
        </div>
      ))}
    </div>
  );
}

// 4. Emit events from anywhere
function ActionButtons() {
  const handleClick = (action: string) => {
    // Emit event - NotificationDisplay will receive it
    appEmitter.emit('notify', `You clicked: ${action}`);
    appEmitter.emit('userAction', action);
  };

  return (
    <div>
      <h1>BlinkHub React Example</h1>
      <button onClick={() => handleClick('Save')}>Save</button>
      <button onClick={() => handleClick('Delete')}>Delete</button>
      <button onClick={() => handleClick('Update')}>Update</button>
    </div>
  );
}

// 5. Main App
export default function App() {
  return (
    <>
      <NotificationDisplay />
      <ActionButtons />
    </>
  );
}
```

### Vue: Complete Minimal App

```vue
<!-- App.vue - Complete working example -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Emitter from 'blink-hub';

// 1. Define your events
type AppEvents = {
  notify: (message: string) => void;
  userAction: (action: string) => void;
};

// 2. Create emitter instance
const appEmitter = new Emitter<AppEvents>();

// 3. Reactive state
const notifications = ref<string[]>([]);

// 4. Subscribe to events
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = appEmitter.subscribe('notify', (message) => {
    notifications.value.push(message);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notifications.value.shift();
    }, 3000);
  });
});

// 5. Cleanup
onUnmounted(() => {
  unsubscribe?.();
});

// 6. Emit events
const handleClick = (action: string) => {
  appEmitter.emit('notify', `You clicked: ${action}`);
  appEmitter.emit('userAction', action);
};
</script>

<template>
  <div>
    <h1>BlinkHub Vue Example</h1>
    
    <!-- Action buttons -->
    <div>
      <button @click="handleClick('Save')">Save</button>
      <button @click="handleClick('Delete')">Delete</button>
      <button @click="handleClick('Update')">Update</button>
    </div>

    <!-- Notifications -->
    <div style="position: fixed; top: 20px; right: 20px;">
      <div
        v-for="(msg, i) in notifications"
        :key="i"
        style="
          background: #4caf50;
          color: white;
          padding: 10px 20px;
          margin: 5px 0;
          border-radius: 4px;
        "
      >
        {{ msg }}
      </div>
    </div>
  </div>
</template>
```

### Svelte: Complete Minimal App

```svelte
<!-- App.svelte - Complete working example -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Emitter from 'blink-hub';

  // 1. Define your events
  type AppEvents = {
    notify: (message: string) => void;
    userAction: (action: string) => void;
  };

  // 2. Create emitter instance
  const appEmitter = new Emitter<AppEvents>();

  // 3. Reactive state
  let notifications: string[] = [];

  // 4. Subscribe to events
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = appEmitter.subscribe('notify', (message) => {
      notifications = [...notifications, message];
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        notifications = notifications.slice(1);
      }, 3000);
    });
  });

  // 5. Cleanup
  onDestroy(() => {
    unsubscribe?.();
  });

  // 6. Emit events
  function handleClick(action: string) {
    appEmitter.emit('notify', `You clicked: ${action}`);
    appEmitter.emit('userAction', action);
  }
</script>

<div>
  <h1>BlinkHub Svelte Example</h1>
  
  <!-- Action buttons -->
  <div>
    <button on:click={() => handleClick('Save')}>Save</button>
    <button on:click={() => handleClick('Delete')}>Delete</button>
    <button on:click={() => handleClick('Update')}>Update</button>
  </div>

  <!-- Notifications -->
  <div style="position: fixed; top: 20px; right: 20px;">
    {#each notifications as msg, i}
      <div
        style="
          background: #4caf50;
          color: white;
          padding: 10px 20px;
          margin: 5px 0;
          border-radius: 4px;
        "
      >
        {msg}
      </div>
    {/each}
  </div>
</div>

<style>
  button {
    margin: 0 5px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
  }
</style>
```

---

## Real-World Use Cases

### React Examples

#### 1. Global Toast Notification System

Create a global notification system without prop drilling or Context API overhead:

```typescript
// services/notifications.ts
import Emitter from 'blink-hub';

type NotificationEvents = {
  success: (message: string) => void;
  error: (message: string, error?: Error) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

export const notificationEmitter = new Emitter<NotificationEvents>();
```

```tsx
// components/ToastContainer.tsx
import { useEffect, useState } from 'react';
import { notificationEmitter } from '../services/notifications';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Set memory limit for production
    notificationEmitter.setMaxListeners(20);

    const unsubscribers = [
      notificationEmitter.subscribe('success', (message) => {
        setToasts(prev => [...prev, { id: Date.now(), type: 'success', message }]);
      }),
      notificationEmitter.subscribe('error', (message) => {
        setToasts(prev => [...prev, { id: Date.now(), type: 'error', message }]);
      }),
      notificationEmitter.subscribe('info', (message) => {
        setToasts(prev => [...prev, { id: Date.now(), type: 'info', message }]);
      }),
    ];

    // Cleanup all listeners on unmount
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// Usage in any component - no props needed!
function SaveButton() {
  const handleSave = async () => {
    try {
      await saveData();
      notificationEmitter.emit('success', 'Data saved successfully!');
    } catch (error) {
      notificationEmitter.emit('error', 'Failed to save data', error as Error);
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

#### 2. Real-Time Chat Application

Handle WebSocket messages with channels for different chat rooms:

```tsx
// services/chat.ts
import Emitter from 'blink-hub';

type ChatEvents = {
  messageReceived: (message: Message) => void;
  userJoined: (user: User) => void;
  userLeft: (userId: string) => void;
  typing: (userId: string, isTyping: boolean) => void;
};

export const chatEmitter = new Emitter<ChatEvents>();

// Create isolated channels for each chat room
export function getChatChannel(roomId: string) {
  return chatEmitter.channel(`room-${roomId}`);
}
```

```tsx
// components/ChatRoom.tsx
import { useEffect, useState } from 'react';
import { getChatChannel } from '../services/chat';

function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    const channel = getChatChannel(roomId);

    const unsubscribers = [
      channel.subscribe('messageReceived', (message) => {
        setMessages(prev => [...prev, message]);
      }),
      channel.subscribe('userJoined', (user) => {
        setOnlineUsers(prev => [...prev, user]);
      }),
      channel.subscribe('userLeft', (userId) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      }),
    ];

    // Cleanup when switching rooms
    return () => unsubscribers.forEach(unsub => unsub());
  }, [roomId]);

  return (
    <div>
      <MessageList messages={messages} />
      <OnlineUsers users={onlineUsers} />
    </div>
  );
}
```

#### 3. Analytics Tracking

Centralized analytics without cluttering your components:

```tsx
// services/analytics.ts
import Emitter from 'blink-hub';

type AnalyticsEvents = {
  pageView: (page: string, metadata?: Record<string, any>) => void;
  buttonClick: (buttonName: string, location: string) => void;
  formSubmit: (formName: string, success: boolean) => void;
  error: (error: Error, context: string) => void;
};

export const analyticsEmitter = new Emitter<AnalyticsEvents>();

// Set up analytics listeners once
analyticsEmitter.subscribe('pageView', (page, metadata) => {
  gtag('event', 'page_view', { page_path: page, ...metadata });
});

analyticsEmitter.subscribe('buttonClick', (buttonName, location) => {
  mixpanel.track('Button Clicked', { button: buttonName, location });
});

analyticsEmitter.subscribe('error', (error, context) => {
  Sentry.captureException(error, { extra: { context } });
});
```

```tsx
// Usage in components
function CheckoutButton() {
  const handleClick = () => {
    analyticsEmitter.emit('buttonClick', 'Checkout', 'CartPage');
    proceedToCheckout();
  };

  return <button onClick={handleClick}>Checkout</button>;
}
```

### Vue Examples

#### 1. Global State Updates Without Vuex

```typescript
// services/user.ts
import Emitter from 'blink-hub';

type UserEvents = {
  loggedIn: (user: User) => void;
  loggedOut: () => void;
  profileUpdated: (updates: Partial<User>) => void;
};

export const userEmitter = new Emitter<UserEvents>();
```

```vue
<!-- components/UserProfile.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { userEmitter } from '../services/user';

const user = ref<User | null>(null);
const unsubscribers: Array<() => void> = [];

onMounted(() => {
  unsubscribers.push(
    userEmitter.subscribe('loggedIn', (newUser) => {
      user.value = newUser;
    }),
    userEmitter.subscribe('loggedOut', () => {
      user.value = null;
    }),
    userEmitter.subscribe('profileUpdated', (updates) => {
      if (user.value) {
        user.value = { ...user.value, ...updates };
      }
    })
  );
});

onUnmounted(() => {
  unsubscribers.forEach(unsub => unsub());
});
</script>

<template>
  <div v-if="user" class="user-profile">
    <img :src="user.avatar" :alt="user.name" />
    <h2>{{ user.name }}</h2>
    <p>{{ user.email }}</p>
  </div>
</template>
```

#### 2. Real-Time Shopping Cart

```typescript
// services/cart.ts
import Emitter from 'blink-hub';

type CartEvents = {
  itemAdded: (item: Product, quantity: number) => void;
  itemRemoved: (itemId: string) => void;
  quantityChanged: (itemId: string, quantity: number) => void;
  cartCleared: () => void;
};

export const cartEmitter = new Emitter<CartEvents>();
```

```vue
<!-- components/CartIcon.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { cartEmitter } from '../services/cart';

const itemCount = ref(0);
const unsubscribers: Array<() => void> = [];

onMounted(() => {
  unsubscribers.push(
    cartEmitter.subscribe('itemAdded', (item, quantity) => {
      itemCount.value += quantity;
    }),
    cartEmitter.subscribe('itemRemoved', () => {
      itemCount.value = Math.max(0, itemCount.value - 1);
    }),
    cartEmitter.subscribe('cartCleared', () => {
      itemCount.value = 0;
    })
  );
});

onUnmounted(() => {
  unsubscribers.forEach(unsub => unsub());
});
</script>

<template>
  <div class="cart-icon">
    <ShoppingCartIcon />
    <span v-if="itemCount > 0" class="badge">{{ itemCount }}</span>
  </div>
</template>
```

### Svelte Examples

#### 1. Global Loading State

```typescript
// services/loading.ts
import Emitter from 'blink-hub';

type LoadingEvents = {
  startLoading: (operation: string) => void;
  stopLoading: (operation: string) => void;
};

export const loadingEmitter = new Emitter<LoadingEvents>();
```

```svelte
<!-- components/LoadingOverlay.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { loadingEmitter } from '../services/loading';

  let activeOperations = new Set<string>();
  $: isLoading = activeOperations.size > 0;

  const unsubscribers: Array<() => void> = [];

  onMount(() => {
    unsubscribers.push(
      loadingEmitter.subscribe('startLoading', (operation) => {
        activeOperations.add(operation);
        activeOperations = activeOperations; // Trigger reactivity
      }),
      loadingEmitter.subscribe('stopLoading', (operation) => {
        activeOperations.delete(operation);
        activeOperations = activeOperations;
      })
    );
  });

  onDestroy(() => {
    unsubscribers.forEach(unsub => unsub());
  });
</script>

{#if isLoading}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{/if}

<!-- Usage in any component -->
<script lang="ts">
  async function fetchData() {
    loadingEmitter.emit('startLoading', 'fetch-data');
    try {
      await api.getData();
    } finally {
      loadingEmitter.emit('stopLoading', 'fetch-data');
    }
  }
</script>
```

#### 2. Form Validation Events

```typescript
// services/validation.ts
import Emitter from 'blink-hub';

type ValidationEvents = {
  fieldValidated: (fieldName: string, isValid: boolean, error?: string) => void;
  formValidated: (formName: string, isValid: boolean) => void;
};

export const validationEmitter = new Emitter<ValidationEvents>();
```

```svelte
<!-- components/ValidationSummary.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { validationEmitter } from '../services/validation';

  let errors: Record<string, string> = {};

  const unsubscribe = onMount(() => {
    return validationEmitter.subscribe('fieldValidated', (field, isValid, error) => {
      if (!isValid && error) {
        errors[field] = error;
      } else {
        delete errors[field];
      }
      errors = errors; // Trigger reactivity
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });
</script>

{#if Object.keys(errors).length > 0}
  <div class="validation-errors">
    {#each Object.entries(errors) as [field, error]}
      <p class="error">{field}: {error}</p>
    {/each}
  </div>
{/if}
```

### Node.js Backend Examples

#### 1. Microservices Event Bus

```typescript
// services/eventBus.ts
import Emitter from 'blink-hub';

type ServiceEvents = {
  userCreated: (user: User) => void;
  orderPlaced: (order: Order) => void;
  paymentProcessed: (payment: Payment) => void;
  emailSent: (recipient: string, subject: string) => void;
};

export const serviceEventBus = new Emitter<ServiceEvents>();

// Set appropriate limits for production
serviceEventBus.setMaxListeners(50);

// Multiple services can listen to the same event
serviceEventBus.subscribe('userCreated', async (user) => {
  await sendWelcomeEmail(user);
});

serviceEventBus.subscribe('userCreated', async (user) => {
  await createUserProfile(user);
});

serviceEventBus.subscribe('userCreated', async (user) => {
  await analytics.track('user_registered', user);
}, 10); // High priority for analytics
```

#### 2. Request Lifecycle Monitoring

```typescript
// middleware/requestMonitoring.ts
import express from 'express';
import Emitter from 'blink-hub';

type RequestEvents = {
  requestStarted: (req: express.Request) => void;
  requestCompleted: (req: express.Request, duration: number) => void;
  requestFailed: (req: express.Request, error: Error) => void;
};

export const requestEmitter = new Emitter<RequestEvents>();

// Logger listens to all request events
requestEmitter.subscribe('requestStarted', (req) => {
  logger.info(`${req.method} ${req.path} started`);
});

requestEmitter.subscribe('requestCompleted', (req, duration) => {
  logger.info(`${req.method} ${req.path} completed in ${duration}ms`);
});

requestEmitter.subscribe('requestFailed', (req, error) => {
  logger.error(`${req.method} ${req.path} failed:`, error);
});

// Metrics collection
requestEmitter.subscribe('requestCompleted', (req, duration) => {
  metrics.histogram('request_duration', duration, {
    method: req.method,
    path: req.route?.path || req.path,
  });
});

// Middleware
export function requestMonitoring(req: express.Request, res: express.Response, next: express.NextFunction) {
  const startTime = Date.now();
  requestEmitter.emit('requestStarted', req);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    requestEmitter.emit('requestCompleted', req, duration);
  });

  next();
}
```

#### 3. Database Change Streams

```typescript
// services/database.ts
import Emitter from 'blink-hub';
import { MongoClient } from 'mongodb';

type DatabaseEvents = {
  documentInserted: (collection: string, document: any) => void;
  documentUpdated: (collection: string, documentId: string, changes: any) => void;
  documentDeleted: (collection: string, documentId: string) => void;
};

export const dbEmitter = new Emitter<DatabaseEvents>();

// Watch for changes
async function watchCollection(collection: string) {
  const changeStream = db.collection(collection).watch();

  changeStream.on('change', (change) => {
    switch (change.operationType) {
      case 'insert':
        dbEmitter.emit('documentInserted', collection, change.fullDocument);
        break;
      case 'update':
        dbEmitter.emit('documentUpdated', collection, change.documentKey._id, change.updateDescription);
        break;
      case 'delete':
        dbEmitter.emit('documentDeleted', collection, change.documentKey._id);
        break;
    }
  });
}

// Cache invalidation
dbEmitter.subscribe('documentUpdated', (collection, id) => {
  cache.invalidate(`${collection}:${id}`);
});

// Real-time notifications
dbEmitter.subscribe('documentInserted', (collection, document) => {
  if (collection === 'orders') {
    websocket.broadcast('new-order', document);
  }
});

// Audit logging
dbEmitter.subscribe('documentDeleted', (collection, id) => {
  auditLog.record({
    action: 'delete',
    collection,
    documentId: id,
    timestamp: new Date(),
  });
});
```

#### 4. Job Queue with Priority

```typescript
// services/jobQueue.ts
import Emitter from 'blink-hub';

type JobEvents = {
  jobQueued: (job: Job) => void;
  jobStarted: (job: Job) => void;
  jobCompleted: (job: Job, result: any) => void;
  jobFailed: (job: Job, error: Error) => void;
};

export const jobEmitter = new Emitter<JobEvents>();

// High priority: System administrators
jobEmitter.subscribe('jobFailed', (job, error) => {
  alerting.sendAlert('critical', `Job ${job.id} failed`, error);
}, 10);

// Medium priority: Monitoring
jobEmitter.subscribe('jobFailed', (job, error) => {
  metrics.increment('jobs.failed', { type: job.type });
}, 5);

// Low priority: Logging
jobEmitter.subscribe('jobFailed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
}, 0);

// Retry failed jobs
jobEmitter.subscribe('jobFailed', async (job, error) => {
  if (job.retries < 3) {
    await retryJob(job);
  }
});
```

## Emitter with Priority

The Emitter now supports priority-based event handling. You can specify priorities when subscribing to events, ensuring that listeners with higher priorities are called before those with lower ones. For example, in a logging system, critical error handlers might have a higher priority than general logging handlers.

Here's how to use priority handling:

```typescript
type TestEvents = {
  testEvent: (val: string) => string;
};

const emitter = new Emitter<TestEvents>();

const results: string[] = [];

emitter.subscribe('testEvent', (val: string) => {
    results.push('Default Priority');
    return val;
});

emitter.subscribe('testEvent', (val: string) => {
    results.push('Higher Priority');
    return val;
}, 10);

emitter.subscribe('testEvent', (val: string) => {
    results.push('Lower Priority');
    return val;
}, -10);

emitter.emit('testEvent', 'some value');

console.log(results);
// The expected order in results should be: ['Higher Priority', 'Default Priority', 'Lower Priority']
```

## Channel-Based Event Handling

The Emitter also supports channel-based event handling, allowing for more granular control over event propagation and listener management.

### Defining Channels

Channels can be created to group specific event types or to separate event handling logic for different parts of an application:

```typescript
type ChannelEvents = {
  channelEvent: (message: string) => void;
};

const emitter = new Emitter<ChannelEvents>();
const chatChannel = emitter.channel('chat');
const notificationChannel = emitter.channel('notification');
```

### Subscribing to Channel Events

Listeners can subscribe to events within a specific channel, which is isolated from the global emitter and other channels:

```typescript
chatChannel.subscribe('channelEvent', (message: string) => {
    console.log(`New chat message: ${message}`);
});

notificationChannel.subscribe('channelEvent', (message: string) => {
    console.log(`New notification: ${message}`);
});
```

### Emitting Channel Events

Events can be emitted on specific channels without affecting listeners on other channels:

```typescript
chatChannel.emit('channelEvent', 'Hello, World!'); 
// Outputs: New chat message: Hello, World!
notificationChannel.emit('channelEvent', 'You have 3 new notifications!'); 
// Outputs: New notification: You have 3 new notifications!
```

This channel-based approach ensures that events are handled only by the listeners that are relevant to the particular context or module, improving modularity and maintainability.

## Memory Management

BlinkHub provides enterprise-grade memory management features to prevent memory leaks and monitor listener usage in production applications. These APIs are compatible with Node.js EventEmitter standards.

### Setting Maximum Listeners

By default, BlinkHub warns you when more than 10 listeners are added to a single event. This helps detect potential memory leaks:

```typescript
const emitter = new Emitter<MyEvents>();

// Set custom limit
emitter.setMaxListeners(20); // Allow up to 20 listeners per event

// Get current limit
console.log(emitter.getMaxListeners()); // 20

// Set to 0 for unlimited (not recommended in production)
emitter.setMaxListeners(0);
```

### Memory Leak Detection

When the listener limit is exceeded, BlinkHub automatically warns you:

```typescript
emitter.setMaxListeners(3);

// Add 4 listeners - triggers warning on the 4th
emitter.subscribe('data', handler1);
emitter.subscribe('data', handler2);
emitter.subscribe('data', handler3);
emitter.subscribe('data', handler4); 
// ⚠️  Possible memory leak detected. 4 listeners added for event "data". 
// Use setMaxListeners() to increase limit. Current limit: 3
```

### Counting Listeners

Track how many listeners are attached to specific events:

```typescript
const emitter = new Emitter<MyEvents>();

emitter.subscribe('userLogin', handler1);
emitter.subscribe('userLogin', handler2);

console.log(emitter.listenerCount('userLogin')); // 2
console.log(emitter.listenerCount('userLogout')); // 0
```

### Getting Event Names

Retrieve all events that currently have listeners:

```typescript
emitter.subscribe('userLogin', () => {});
emitter.subscribe('userLogout', () => {});
emitter.subscribe('dataUpdate', () => {});

const events = emitter.getEventNames();
console.log(events); // ['userLogin', 'userLogout', 'dataUpdate']
```

### Inspecting Listeners

Get all listener functions for a specific event:

```typescript
const handler1 = (data: string) => console.log('Handler 1:', data);
const handler2 = (data: string) => console.log('Handler 2:', data);

emitter.subscribe('data', handler1);
emitter.subscribe('data', handler2);

const listeners = emitter.getListeners('data');
console.log(listeners); // [handler1, handler2]
```

### Removing All Listeners

Clean up listeners for specific events or all events at once:

```typescript
// Remove all listeners for a specific event
emitter.removeAllListeners('userLogin');

// Remove all listeners for all events
emitter.removeAllListeners();

// Chainable API
emitter
  .setMaxListeners(15)
  .removeAllListeners('oldEvent');
```

### Memory Management Best Practices

```typescript
// ✅ Good: Clean up in component lifecycle
class UserService {
  private emitter = new Emitter<UserEvents>();
  private unsubscribers: Array<() => void> = [];

  init() {
    this.unsubscribers.push(
      this.emitter.subscribe('login', this.handleLogin),
      this.emitter.subscribe('logout', this.handleLogout)
    );
  }

  destroy() {
    // Clean up all listeners
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}

// ✅ Good: Monitor listener counts in production
function monitorEmitterHealth(emitter: Emitter<any>) {
  const events = emitter.getEventNames();
  events.forEach(event => {
    const count = emitter.listenerCount(event);
    if (count > 5) {
      console.warn(`High listener count for "${event}": ${count}`);
    }
  });
}

// ❌ Bad: Never cleaning up listeners
setInterval(() => {
  emitter.subscribe('tick', () => {}); // Memory leak!
}, 1000);

// ✅ Good: Reuse same handler or clean up
const tickHandler = () => {};
setInterval(() => {
  // Only subscribes once since it's the same function reference
  emitter.subscribe('tick', tickHandler);
}, 1000);
```

## Additional Information

### FAQ for React developers

Why You Might Choose Event Emitters Over Context in React?

Note: Same reasons can/may apply for all framework/libraries.

While React's Context API offers a powerful way to manage and propagate state changes through your component tree, 
there are scenarios where an event emitter might be a more appropriate choice. 
Below, we detail some reasons why developers might opt for event emitters in certain situations.

- **Granularity** 
  - Event emitters allow you to listen to very specific events. With the Context API, any component consuming the context will re-render when the context value changes. If you're looking to react to specific events rather than broad state changes, an event emitter could be more suitable.

- **Decoupling** 
  - Event emitters facilitate a decoupled architecture. Components or services can emit events without knowing or caring about the listeners. This can lead to more modular and maintainable code, particularly in larger applications.

- **Cross-Framework Compatibility** 
  - In environments where different parts of your application use different frameworks or vanilla JavaScript, event emitters can provide a unified communication channel across these segments.

- **Multiple Listeners** 
  - Event emitters inherently support having multiple listeners for a single event. This can be leveraged to trigger various side effects from one event, whereas with Context API, this would need manual management.

- **Deeply Nested Components** 
  - In applications with deeply nested component structures, prop-drilling or managing context might become cumbersome. Event emitters can be an alternative to simplify state and event management in such cases.

- **Historical Reasons** 
  - Older codebases developed before the advent of hooks and the newer Context API features might still employ event emitters, as they once provided a simpler solution to global state management in React.

- **Performance** 
  - Event emitters might provide a performance edge in cases where the Context API might cause unnecessary re-renders. Since event emitters don't inherently lead to re-renders, they can be more performant in specific scenarios.

- **Non-UI Logic** 
  - For parts of your application logic that reside outside the React component tree, event emitters can be beneficial, as they aren't tied to React's lifecycle or component hierarchy.

### Link to React Example

**For a practical use case in React using the BlinkHub Emitter, see the [React example on GitHub](https://github.com/valehasadli/blinkhub-react-example).**
