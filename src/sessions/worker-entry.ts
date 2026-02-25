declare var self: Worker;

/**
 * Worker entry point — runs inside a Bun Worker.
 *
 * Receives an init message from the main thread, creates an agent session
 * via the omp SDK, and bridges SDK events to {@link WorkerEvent} messages
 * posted back to the main thread.
 *
 * @module sessions/worker-entry
 */

import { createAgentSession } from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";

import type {
  SessionId,
  WorkerEvent,
  MainToWorkerMessage,
  WorkerSessionOptions,
} from "../types.js";
import type { WorkerInitMessage } from "./worker.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let sessionId: SessionId;
let agentSession: Awaited<ReturnType<typeof createAgentSession>>["session"] | null = null;
let disposed = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post(event: WorkerEvent): void {
  self.postMessage(event);
}

function postStatus(status: import("../types.js").WorkerStatus): void {
  post({ type: "status_changed", sessionId, status } as WorkerEvent);
}

function postError(message: string, stack?: string): void {
  post({ type: "error", sessionId, message, stack });
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

async function initialize(options: WorkerSessionOptions): Promise<void> {
  try {
    const sessionOpts: Record<string, unknown> = {
      cwd: options.cwd,
      hasUI: false,
      sessionManager: SessionManager.inMemory(),
    };
    if (options.model) sessionOpts.modelPattern = options.model;
    if (options.thinkingLevel) sessionOpts.thinkingLevel = options.thinkingLevel;

    const result = await createAgentSession(
      sessionOpts as Parameters<typeof createAgentSession>[0],
    );

    agentSession = result.session;

    // Subscribe to SDK events and bridge them to WorkerEvent messages.
    agentSession.subscribe(async (event: { type: string; [key: string]: unknown }) => {
      const now = new Date().toISOString();

      switch (event.type) {
        case "message_start": {
          postStatus("working");
          break;
        }
        case "message_end": {
          const tokenCount = typeof event.tokenCount === "number" ? event.tokenCount : 0;
          post({
            type: "activity",
            sessionId,
            lastActivityAt: now,
            tokenCount,
          });
          postStatus("idle");
          break;
        }
        case "tool_call": {
          post({
            type: "activity",
            sessionId,
            lastActivityAt: now,
            tokenCount: typeof event.tokenCount === "number" ? event.tokenCount : 0,
          });
          break;
        }
      }
    });

    postStatus("idle");

    // If an initial prompt was provided, send it immediately.
    if (options.initialPrompt) {
      await handlePrompt(options.initialPrompt);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    postError(`Initialization failed: ${message}`, stack);
  }
}

// ---------------------------------------------------------------------------
// Command handling
// ---------------------------------------------------------------------------

async function handlePrompt(text: string): Promise<void> {
  if (!agentSession) {
    postError("Cannot prompt: session not initialized");
    return;
  }

  try {
    postStatus("working");
    await agentSession.prompt(text);
    postStatus("idle");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postError(`Prompt failed: ${message}`, err instanceof Error ? err.stack : undefined);
  }
}

async function handleAbort(): Promise<void> {
  if (!agentSession) return;

  try {
    await agentSession.abort();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postError(`Abort failed: ${message}`);
  }
}

async function handleShutdown(): Promise<void> {
  if (disposed) {
    post({ type: "shutdown_complete", sessionId });
    return;
  }
  disposed = true;

  try {
    if (agentSession) {
      await agentSession.dispose();
      agentSession = null;
    }
  } catch {
    // Best-effort cleanup.
  }

  post({ type: "shutdown_complete", sessionId });
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (evt: MessageEvent<WorkerInitMessage | MainToWorkerMessage>) => {
  const msg = evt.data;

  if (msg.type === "init") {
    const initMsg = msg as WorkerInitMessage;
    sessionId = initMsg.sessionId;
    await initialize(initMsg.options);
    return;
  }

  const command = msg as MainToWorkerMessage;

  switch (command.type) {
    case "prompt": {
      await handlePrompt(command.text);
      break;
    }
    case "approve": {
      // Stub: approval flow is complex, just resume working.
      postStatus("working");
      break;
    }
    case "reject": {
      // Stub: rejection flow is complex, just resume working.
      postStatus("working");
      break;
    }
    case "abort": {
      await handleAbort();
      break;
    }
    case "shutdown": {
      await handleShutdown();
      break;
    }
  }
};
