# Hook Integrator Library

The Hook Integrator library provides event processing and lifecycle hooks for Claude Code sessions. It allows you to register and trigger hooks for various events during a Claude Code session.

## Features

- Dynamic hook loading from TypeScript/JavaScript files
- Support for async and sync hook handlers
- Error isolation to prevent hook failures from affecting the main application
- Built-in lifecycle hooks for Claude Code sessions
- Custom hook support for application-specific events

## Usage

### Basic Usage

```typescript
import { HookIntegrator } from './hook-integrator';

// Create hook integrator instance
const hooks = new HookIntegrator('.specstar/hooks.ts');

// Load hooks from file
await hooks.load();

// Trigger hooks
await hooks.triggerHook('beforeSession');
await hooks.triggerHook({
  type: 'onFileChange',
  timestamp: new Date().toISOString(),
  data: { file: '/path/to/file.ts', operation: 'modify' }
});
```

### Programmatic Hook Registration

```typescript
// Register hooks programmatically
hooks.registerHook('beforeSession', async (event) => {
  console.log('Session starting:', event.timestamp);
});

hooks.registerHook('onError', (event) => {
  console.error('Error occurred:', event.data.error);
});
```

### Configuration Options

```typescript
const hooks = new HookIntegrator({
  hooksPath: '.specstar/hooks.ts',
  isolateErrors: true  // Default: true - prevents hook errors from crashing the app
});
```

## Hook Types

### Built-in Lifecycle Hooks

- **beforeSession**: Called before a new Claude Code session starts
- **afterSession**: Called after a Claude Code session ends
- **onFileChange**: Called when files change during a session
- **onCommand**: Called when commands are executed
- **onError**: Called when errors occur in other hooks

### Hook Event Structure

```typescript
interface HookEvent {
  type: string;        // Event type (e.g., 'beforeSession')
  timestamp: string;   // ISO 8601 timestamp
  data: any;          // Event-specific data
}
```

## Writing Hooks

Create a `hooks.ts` file in your project:

```typescript
import type { HookEvent } from 'specstar/lib/hook-integrator';

// Export individual hooks
export const beforeSession = async (event: HookEvent) => {
  console.log('Session starting');
  // Initialize resources
};

export const onFileChange = (event: HookEvent) => {
  const { file, operation } = event.data;
  console.log(`File ${operation}: ${file}`);
};

// Or export as default
export default {
  beforeSession,
  onFileChange,
  afterSession: async (event) => {
    // Cleanup resources
  }
};
```

## API Reference

### Constructor

```typescript
new HookIntegrator(hooksPath: string | HookIntegratorOptions)
```

### Methods

#### `load(): Promise<void>`
Load hooks from the configured hooks file.

#### `loadHooks(): Promise<void>`
Alias for `load()`. Loads and validates hooks from file.

#### `registerHook(event: string, handler: HookHandler): void`
Register a hook handler for a specific event.

#### `triggerHook(event: string | HookEvent): Promise<void>`
Trigger all registered hooks for an event.

#### `validateHooks(): Promise<void>`
Validate that loaded hooks are valid functions.

#### `clearHooks(): void`
Remove all registered hooks.

#### `getRegisteredEvents(): string[]`
Get list of events that have registered handlers.

#### `hasHandlers(event: string): boolean`
Check if an event has any registered handlers.

#### `removeHandlers(event: string): void`
Remove all handlers for a specific event.

#### `getHandlerCount(event: string): number`
Get the number of handlers registered for an event.

## Error Handling

By default, errors in hooks are isolated to prevent them from crashing the application:

1. Errors are caught and logged
2. The `onError` hook is triggered with error details
3. Other hooks continue to execute

To disable error isolation:

```typescript
const hooks = new HookIntegrator({
  hooksPath: './hooks.ts',
  isolateErrors: false  // Errors will propagate
});
```

## Testing

Run tests with:

```bash
bun test src/lib/hook-integrator
```

The test suite covers:
- Hook registration and triggering
- File loading and validation
- Error handling and isolation
- Async hook support
- Integration scenarios
