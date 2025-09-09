/**
 * HookEvent Model
 * Represents events triggered by Claude Code lifecycle hooks
 */

export enum HookEventType {
  SessionStart = 'session:start',
  SessionEnd = 'session:end',
  SessionPause = 'session:pause',
  SessionResume = 'session:resume',
  SessionError = 'session:error',
  FileRead = 'file:read',
  FileWrite = 'file:write',
  FileEdit = 'file:edit',
  FileDelete = 'file:delete',
  FileCreate = 'file:create',
  CommandExecute = 'command:execute',
  CommandComplete = 'command:complete',
  CommandError = 'command:error',
  AgentStart = 'agent:start',
  AgentComplete = 'agent:complete',
  AgentError = 'agent:error',
  ToolInvoke = 'tool:invoke',
  ToolComplete = 'tool:complete',
  ToolError = 'tool:error',
  Custom = 'custom'
}

export interface HookEventData {
  // Session events
  sessionId?: string;
  projectPath?: string;
  claudeVersion?: string;
  modelId?: string;
  
  // File events
  filePath?: string;
  fileContent?: string;
  fileSize?: number;
  lineCount?: number;
  operation?: string;
  
  // Command events
  command?: string;
  exitCode?: number;
  output?: string;
  error?: string;
  duration?: number;
  
  // Agent events
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  agentStatus?: string;
  
  // Tool events
  toolName?: string;
  toolParams?: Record<string, unknown>;
  toolResult?: unknown;
  
  // Error information
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;
  
  // Custom data
  [key: string]: unknown;
}

export interface HookEvent {
  type: HookEventType;
  timestamp: string;
  data: HookEventData;
  sessionId: string;
  id?: string;
  source?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface HookEventFilter {
  types?: HookEventType[];
  sessionId?: string;
  startTime?: string;
  endTime?: string;
  source?: string;
  userId?: string;
}

export interface HookEventHandler {
  id: string;
  name: string;
  types: HookEventType[];
  enabled: boolean;
  async: boolean;
  handler: (event: HookEvent) => void | Promise<void>;
  filter?: (event: HookEvent) => boolean;
  priority?: number;
}

/**
 * Validation functions
 */
export function isValidHookEventData(data: unknown): data is HookEventData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  
  // All fields are optional, so we just check types when present
  return (
    (d.sessionId === undefined || typeof d.sessionId === 'string') &&
    (d.projectPath === undefined || typeof d.projectPath === 'string') &&
    (d.claudeVersion === undefined || typeof d.claudeVersion === 'string') &&
    (d.modelId === undefined || typeof d.modelId === 'string') &&
    (d.filePath === undefined || typeof d.filePath === 'string') &&
    (d.fileContent === undefined || typeof d.fileContent === 'string') &&
    (d.fileSize === undefined || typeof d.fileSize === 'number') &&
    (d.lineCount === undefined || typeof d.lineCount === 'number') &&
    (d.operation === undefined || typeof d.operation === 'string') &&
    (d.command === undefined || typeof d.command === 'string') &&
    (d.exitCode === undefined || typeof d.exitCode === 'number') &&
    (d.output === undefined || typeof d.output === 'string') &&
    (d.error === undefined || typeof d.error === 'string') &&
    (d.duration === undefined || typeof d.duration === 'number') &&
    (d.agentId === undefined || typeof d.agentId === 'string') &&
    (d.agentName === undefined || typeof d.agentName === 'string') &&
    (d.agentRole === undefined || typeof d.agentRole === 'string') &&
    (d.agentStatus === undefined || typeof d.agentStatus === 'string') &&
    (d.toolName === undefined || typeof d.toolName === 'string') &&
    (d.toolParams === undefined || typeof d.toolParams === 'object') &&
    (d.errorMessage === undefined || typeof d.errorMessage === 'string') &&
    (d.errorStack === undefined || typeof d.errorStack === 'string') &&
    (d.errorCode === undefined || typeof d.errorCode === 'string')
  );
}

export function isValidHookEvent(event: unknown): event is HookEvent {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Record<string, unknown>;
  
  return (
    Object.values(HookEventType).includes(e.type as HookEventType) &&
    typeof e.timestamp === 'string' &&
    isValidHookEventData(e.data) &&
    typeof e.sessionId === 'string' &&
    (e.id === undefined || typeof e.id === 'string') &&
    (e.source === undefined || typeof e.source === 'string') &&
    (e.userId === undefined || typeof e.userId === 'string') &&
    (e.metadata === undefined || typeof e.metadata === 'object')
  );
}

export function isValidHookEventFilter(filter: unknown): filter is HookEventFilter {
  if (typeof filter !== 'object' || filter === null) return false;
  const f = filter as Record<string, unknown>;
  
  return (
    (f.types === undefined || (Array.isArray(f.types) && 
      f.types.every(t => Object.values(HookEventType).includes(t as HookEventType)))) &&
    (f.sessionId === undefined || typeof f.sessionId === 'string') &&
    (f.startTime === undefined || typeof f.startTime === 'string') &&
    (f.endTime === undefined || typeof f.endTime === 'string') &&
    (f.source === undefined || typeof f.source === 'string') &&
    (f.userId === undefined || typeof f.userId === 'string')
  );
}

/**
 * Factory functions
 */
export function createHookEvent(params: {
  type: HookEventType;
  sessionId: string;
  data?: HookEventData;
  source?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): HookEvent {
  return {
    id: generateEventId(),
    type: params.type,
    timestamp: new Date().toISOString(),
    data: params.data || {},
    sessionId: params.sessionId,
    source: params.source || 'specstar',
    userId: params.userId,
    metadata: params.metadata
  };
}

export function createSessionStartEvent(params: {
  sessionId: string;
  projectPath?: string;
  claudeVersion?: string;
  modelId?: string;
}): HookEvent {
  return createHookEvent({
    type: HookEventType.SessionStart,
    sessionId: params.sessionId,
    data: {
      sessionId: params.sessionId,
      projectPath: params.projectPath,
      claudeVersion: params.claudeVersion,
      modelId: params.modelId
    }
  });
}

export function createFileEvent(params: {
  type: HookEventType.FileRead | HookEventType.FileWrite | HookEventType.FileEdit | 
        HookEventType.FileDelete | HookEventType.FileCreate;
  sessionId: string;
  filePath: string;
  fileContent?: string;
  fileSize?: number;
  lineCount?: number;
}): HookEvent {
  return createHookEvent({
    type: params.type,
    sessionId: params.sessionId,
    data: {
      filePath: params.filePath,
      fileContent: params.fileContent,
      fileSize: params.fileSize,
      lineCount: params.lineCount,
      operation: params.type.split(':')[1]
    }
  });
}

export function createCommandEvent(params: {
  type: HookEventType.CommandExecute | HookEventType.CommandComplete | HookEventType.CommandError;
  sessionId: string;
  command: string;
  exitCode?: number;
  output?: string;
  error?: string;
  duration?: number;
}): HookEvent {
  return createHookEvent({
    type: params.type,
    sessionId: params.sessionId,
    data: {
      command: params.command,
      exitCode: params.exitCode,
      output: params.output,
      error: params.error,
      duration: params.duration
    }
  });
}

export function createErrorEvent(params: {
  type: HookEventType;
  sessionId: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
  data?: HookEventData;
}): HookEvent {
  return createHookEvent({
    type: params.type,
    sessionId: params.sessionId,
    data: {
      ...params.data,
      errorMessage: params.errorMessage,
      errorStack: params.errorStack,
      errorCode: params.errorCode
    }
  });
}

/**
 * Serialization/Deserialization
 */
export function serializeHookEvent(event: HookEvent): string {
  return JSON.stringify(event, null, 2);
}

export function deserializeHookEvent(data: string): HookEvent {
  const parsed = JSON.parse(data);
  if (!isValidHookEvent(parsed)) {
    throw new Error('Invalid hook event data');
  }
  return parsed;
}

/**
 * Event filtering and querying
 */
export function filterEvents(events: HookEvent[], filter: HookEventFilter): HookEvent[] {
  let filtered = [...events];
  
  if (filter.types && filter.types.length > 0) {
    filtered = filtered.filter(e => filter.types!.includes(e.type));
  }
  
  if (filter.sessionId) {
    filtered = filtered.filter(e => e.sessionId === filter.sessionId);
  }
  
  if (filter.source) {
    filtered = filtered.filter(e => e.source === filter.source);
  }
  
  if (filter.userId) {
    filtered = filtered.filter(e => e.userId === filter.userId);
  }
  
  if (filter.startTime) {
    const startTime = new Date(filter.startTime).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= startTime);
  }
  
  if (filter.endTime) {
    const endTime = new Date(filter.endTime).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= endTime);
  }
  
  return filtered;
}

export function sortEvents(
  events: HookEvent[],
  order: 'asc' | 'desc' = 'asc'
): HookEvent[] {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

export function groupEventsByType(events: HookEvent[]): Map<HookEventType, HookEvent[]> {
  const grouped = new Map<HookEventType, HookEvent[]>();
  
  for (const event of events) {
    const typeEvents = grouped.get(event.type) || [];
    typeEvents.push(event);
    grouped.set(event.type, typeEvents);
  }
  
  return grouped;
}

export function groupEventsBySession(events: HookEvent[]): Map<string, HookEvent[]> {
  const grouped = new Map<string, HookEvent[]>();
  
  for (const event of events) {
    const sessionEvents = grouped.get(event.sessionId) || [];
    sessionEvents.push(event);
    grouped.set(event.sessionId, sessionEvents);
  }
  
  return grouped;
}

/**
 * Event handler management
 */
export function createEventHandler(params: {
  name: string;
  types: HookEventType[];
  handler: (event: HookEvent) => void | Promise<void>;
  enabled?: boolean;
  async?: boolean;
  filter?: (event: HookEvent) => boolean;
  priority?: number;
}): HookEventHandler {
  return {
    id: generateHandlerId(),
    name: params.name,
    types: params.types,
    enabled: params.enabled ?? true,
    async: params.async ?? false,
    handler: params.handler,
    filter: params.filter,
    priority: params.priority ?? 0
  };
}

export function sortHandlersByPriority(handlers: HookEventHandler[]): HookEventHandler[] {
  return [...handlers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export async function dispatchEvent(
  event: HookEvent,
  handlers: HookEventHandler[]
): Promise<void> {
  const sortedHandlers = sortHandlersByPriority(handlers);
  
  for (const handler of sortedHandlers) {
    if (!handler.enabled) continue;
    if (!handler.types.includes(event.type)) continue;
    if (handler.filter && !handler.filter(event)) continue;
    
    try {
      if (handler.async) {
        await handler.handler(event);
      } else {
        handler.handler(event);
      }
    } catch (error) {
      console.error(`Error in handler ${handler.name}:`, error);
    }
  }
}

/**
 * Utilities
 */
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateHandlerId(): string {
  return `handler-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function isFileEvent(type: HookEventType): boolean {
  return [
    HookEventType.FileRead,
    HookEventType.FileWrite,
    HookEventType.FileEdit,
    HookEventType.FileDelete,
    HookEventType.FileCreate
  ].includes(type);
}

export function isCommandEvent(type: HookEventType): boolean {
  return [
    HookEventType.CommandExecute,
    HookEventType.CommandComplete,
    HookEventType.CommandError
  ].includes(type);
}

export function isSessionEvent(type: HookEventType): boolean {
  return [
    HookEventType.SessionStart,
    HookEventType.SessionEnd,
    HookEventType.SessionPause,
    HookEventType.SessionResume,
    HookEventType.SessionError
  ].includes(type);
}

export function isErrorEvent(event: HookEvent): boolean {
  return event.type.includes(':error') || 
         event.data.errorMessage !== undefined;
}

/**
 * Default values
 */
export const DEFAULT_HOOK_EVENT: HookEvent = {
  type: HookEventType.Custom,
  timestamp: new Date().toISOString(),
  data: {},
  sessionId: ''
};