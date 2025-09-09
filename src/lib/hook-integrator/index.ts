import { $ } from "bun";
import path from "path";

export interface HookEvent {
  type: string;
  timestamp: string;
  data: any;
}

export interface HookIntegratorOptions {
  hooksPath: string;
  isolateErrors?: boolean;
}

export type HookHandler = (event: HookEvent) => void | Promise<void>;

export interface Hooks {
  beforeSession?: HookHandler;
  afterSession?: HookHandler;
  onFileChange?: HookHandler;
  onCommand?: HookHandler;
  onError?: HookHandler;
  [key: string]: HookHandler | undefined;
}

export class HookIntegrator {
  private hooksPath: string;
  private isolateErrors: boolean;
  private hooks: Map<string, HookHandler[]> = new Map();
  private loadedHooks: Hooks | null = null;

  constructor(hooksPathOrOptions: string | HookIntegratorOptions) {
    // Support both string path and options object for compatibility
    if (typeof hooksPathOrOptions === 'string') {
      this.hooksPath = hooksPathOrOptions;
      this.isolateErrors = true;
    } else {
      this.hooksPath = hooksPathOrOptions.hooksPath;
      this.isolateErrors = hooksPathOrOptions.isolateErrors ?? true;
    }
  }

  /**
   * Load hooks from the specified hooks.ts file
   */
  async load(): Promise<void> {
    await this.loadHooks();
  }

  /**
   * Register a hook handler for a specific event
   */
  registerHook(event: string, handler: HookHandler): void {
    if (typeof handler !== 'function') {
      throw new Error(`Hook handler for event "${event}" must be a function`);
    }

    const handlers = this.hooks.get(event) || [];
    handlers.push(handler);
    this.hooks.set(event, handlers);
  }

  /**
   * Trigger all registered hooks for a specific event
   */
  async triggerHook(event: string | HookEvent): Promise<void> {
    // Normalize event to HookEvent format
    const hookEvent: HookEvent = typeof event === 'string' 
      ? {
          type: event,
          timestamp: new Date().toISOString(),
          data: {}
        }
      : event;

    // Get handlers for this event type
    const handlers = this.hooks.get(hookEvent.type) || [];
    
    // Execute all handlers
    for (const handler of handlers) {
      try {
        const result = handler(hookEvent);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        if (!this.isolateErrors) {
          throw error;
        }
        // If errors are isolated, trigger onError hook
        await this.handleHookError(hookEvent.type, error);
      }
    }
  }

  /**
   * Load hooks from the hooks.ts file
   */
  async loadHooks(): Promise<void> {
    const resolvedPath = path.resolve(this.hooksPath);
    
    try {
      // Check if hooks file exists
      const file = Bun.file(resolvedPath);
      const exists = await file.exists();
      
      if (!exists) {
        console.warn(`Hooks file not found at: ${resolvedPath}`);
        return;
      }

      // Dynamically import the hooks module
      const hooksModule = await import(resolvedPath);
      
      // Extract hooks from the module
      this.loadedHooks = hooksModule.default || hooksModule;
      
      // Validate and register each hook
      await this.validateHooks();
      
      // Register all valid hooks
      if (this.loadedHooks) {
        for (const [eventName, handler] of Object.entries(this.loadedHooks)) {
          if (handler && typeof handler === 'function') {
            this.registerHook(eventName, handler);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load hooks from ${resolvedPath}:`, error);
      if (!this.isolateErrors) {
        throw error;
      }
    }
  }

  /**
   * Validate that loaded hooks are valid functions
   */
  async validateHooks(): Promise<void> {
    if (!this.loadedHooks) {
      return;
    }

    const validEventTypes = [
      'beforeSession',
      'afterSession', 
      'onFileChange',
      'onCommand',
      'onError'
    ];

    for (const [eventName, handler] of Object.entries(this.loadedHooks)) {
      // Skip undefined entries
      if (handler === undefined) {
        continue;
      }

      // Validate handler is a function
      if (typeof handler !== 'function') {
        console.warn(`Hook "${eventName}" is not a function, skipping`);
        delete this.loadedHooks[eventName];
        continue;
      }

      // Warn about unknown event types (but still allow them)
      if (!validEventTypes.includes(eventName)) {
        console.warn(`Unknown hook event type: "${eventName}". Valid types are: ${validEventTypes.join(', ')}`);
      }
    }
  }

  /**
   * Handle errors that occur during hook execution
   */
  private async handleHookError(eventType: string, error: any): Promise<void> {
    console.error(`Error in hook "${eventType}":`, error);
    
    // Trigger onError hooks if available
    const errorEvent: HookEvent = {
      type: 'onError',
      timestamp: new Date().toISOString(),
      data: {
        originalEvent: eventType,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      }
    };

    // Get onError handlers
    const errorHandlers = this.hooks.get('onError') || [];
    
    // Execute error handlers (without recursion)
    for (const handler of errorHandlers) {
      try {
        const result = handler(errorEvent);
        if (result instanceof Promise) {
          await result;
        }
      } catch (err) {
        // Log but don't recurse on error handler errors
        console.error('Error in onError handler:', err);
      }
    }
  }

  /**
   * Clear all registered hooks
   */
  clearHooks(): void {
    this.hooks.clear();
    this.loadedHooks = null;
  }

  /**
   * Get the list of registered event types
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Check if a specific event has handlers
   */
  hasHandlers(event: string): boolean {
    const handlers = this.hooks.get(event);
    return handlers ? handlers.length > 0 : false;
  }

  /**
   * Remove all handlers for a specific event
   */
  removeHandlers(event: string): void {
    this.hooks.delete(event);
  }

  /**
   * Get the count of handlers for a specific event
   */
  getHandlerCount(event: string): number {
    const handlers = this.hooks.get(event);
    return handlers ? handlers.length : 0;
  }
}

export default HookIntegrator;