/**
 * Session Model
 * Represents a Claude Code session with agents, files, and commands
 */

// Re-export SessionData from session-monitor to maintain consistency
export type { SessionData } from '../lib/session-monitor';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
  metadata?: Record<string, unknown>;
}

export interface FileOperation {
  path: string;
  operation: 'read' | 'write' | 'edit' | 'delete' | 'create';
  timestamp: string;
  lineCount?: number;
  size?: number;
}

export interface Command {
  command: string;
  timestamp: string;
  exitCode?: number;
  duration?: number;
  output?: string;
}

export enum SessionStatus {
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Error = 'error',
  Cancelled = 'cancelled'
}

export interface Session {
  id: string;
  agents: Agent[];
  timestamp: string;
  status: SessionStatus;
  files: FileOperation[];
  commands: Command[];
  projectPath?: string;
  duration?: number;
  metadata?: {
    claudeVersion?: string;
    modelId?: string;
    platform?: string;
    [key: string]: unknown;
  };
}

/**
 * Validation functions
 */
export function isValidAgent(agent: unknown): agent is Agent {
  if (typeof agent !== 'object' || agent === null) return false;
  const a = agent as Record<string, unknown>;
  
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.role === 'string' &&
    ['active', 'idle', 'completed', 'error'].includes(a.status as string) &&
    typeof a.startTime === 'string' &&
    (a.endTime === undefined || typeof a.endTime === 'string') &&
    (a.metadata === undefined || typeof a.metadata === 'object')
  );
}

export function isValidFileOperation(op: unknown): op is FileOperation {
  if (typeof op !== 'object' || op === null) return false;
  const o = op as Record<string, unknown>;
  
  return (
    typeof o.path === 'string' &&
    ['read', 'write', 'edit', 'delete', 'create'].includes(o.operation as string) &&
    typeof o.timestamp === 'string' &&
    (o.lineCount === undefined || typeof o.lineCount === 'number') &&
    (o.size === undefined || typeof o.size === 'number')
  );
}

export function isValidCommand(cmd: unknown): cmd is Command {
  if (typeof cmd !== 'object' || cmd === null) return false;
  const c = cmd as Record<string, unknown>;
  
  return (
    typeof c.command === 'string' &&
    typeof c.timestamp === 'string' &&
    (c.exitCode === undefined || typeof c.exitCode === 'number') &&
    (c.duration === undefined || typeof c.duration === 'number') &&
    (c.output === undefined || typeof c.output === 'string')
  );
}

export function isValidSession(session: unknown): session is Session {
  if (typeof session !== 'object' || session === null) return false;
  const s = session as Record<string, unknown>;
  
  return (
    typeof s.id === 'string' &&
    Array.isArray(s.agents) && s.agents.every(isValidAgent) &&
    typeof s.timestamp === 'string' &&
    Object.values(SessionStatus).includes(s.status as SessionStatus) &&
    Array.isArray(s.files) && s.files.every(isValidFileOperation) &&
    Array.isArray(s.commands) && s.commands.every(isValidCommand) &&
    (s.projectPath === undefined || typeof s.projectPath === 'string') &&
    (s.duration === undefined || typeof s.duration === 'number') &&
    (s.metadata === undefined || typeof s.metadata === 'object')
  );
}

/**
 * Factory functions
 */
export function createAgent(params: {
  id?: string;
  name: string;
  role: string;
  status?: Agent['status'];
  metadata?: Record<string, unknown>;
}): Agent {
  return {
    id: params.id || generateId(),
    name: params.name,
    role: params.role,
    status: params.status || 'idle',
    startTime: new Date().toISOString(),
    metadata: params.metadata
  };
}

export function createFileOperation(params: {
  path: string;
  operation: FileOperation['operation'];
  lineCount?: number;
  size?: number;
}): FileOperation {
  return {
    path: params.path,
    operation: params.operation,
    timestamp: new Date().toISOString(),
    lineCount: params.lineCount,
    size: params.size
  };
}

export function createCommand(params: {
  command: string;
  exitCode?: number;
  duration?: number;
  output?: string;
}): Command {
  return {
    command: params.command,
    timestamp: new Date().toISOString(),
    exitCode: params.exitCode,
    duration: params.duration,
    output: params.output
  };
}

export function createSession(params?: {
  id?: string;
  agents?: Agent[];
  status?: SessionStatus;
  projectPath?: string;
  metadata?: Session['metadata'];
}): Session {
  return {
    id: params?.id || generateId(),
    agents: params?.agents || [],
    timestamp: new Date().toISOString(),
    status: params?.status || SessionStatus.Active,
    files: [],
    commands: [],
    projectPath: params?.projectPath,
    metadata: params?.metadata
  };
}

/**
 * Serialization/Deserialization
 */
export function serializeSession(session: Session): string {
  return JSON.stringify(session, null, 2);
}

export function deserializeSession(data: string): Session {
  const parsed = JSON.parse(data);
  if (!isValidSession(parsed)) {
    throw new Error('Invalid session data');
  }
  return parsed;
}

/**
 * Deserialize SessionData from hooks JSON format
 */
export function deserializeSessionData(data: string): SessionData {
  const parsed = JSON.parse(data);
  if (!isValidSessionData(parsed)) {
    throw new Error('Invalid session data from hooks');
  }
  return parsed;
}

/**
 * Validate SessionData structure
 */
export function isValidSessionData(data: unknown): data is SessionData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  
  return (
    typeof d.session_id === 'string' &&
    typeof d.session_title === 'string' &&
    typeof d.session_active === 'boolean' &&
    typeof d.created_at === 'string' &&
    typeof d.updated_at === 'string' &&
    Array.isArray(d.agents) && d.agents.every(a => typeof a === 'string') &&
    Array.isArray(d.agents_history) &&
    typeof d.files === 'object' && d.files !== null &&
    Array.isArray((d.files as any).new) &&
    Array.isArray((d.files as any).edited) &&
    Array.isArray((d.files as any).read) &&
    typeof d.tools_used === 'object' &&
    Array.isArray(d.errors) &&
    Array.isArray(d.prompts) &&
    Array.isArray(d.notifications)
  );
}

/**
 * Convert SessionData from hooks to Session model
 */
export function sessionDataToSession(data: SessionData): Session {
  const agents: Agent[] = data.agents_history.map(a => ({
    id: `${a.name}-${a.started_at}`,
    name: a.name,
    role: a.name,  // Use name as role for now
    status: a.completed_at ? 'completed' as const : 
            data.agents.includes(a.name) ? 'active' as const : 'idle' as const,
    startTime: a.started_at,
    endTime: a.completed_at
  }));
  
  const files: FileOperation[] = [
    ...data.files.new.map(path => ({
      path,
      operation: 'create' as const,
      timestamp: data.created_at  // We don't have exact timestamps
    })),
    ...data.files.edited.map(path => ({
      path,
      operation: 'edit' as const,
      timestamp: data.created_at
    })),
    ...data.files.read.map(path => ({
      path,
      operation: 'read' as const,
      timestamp: data.created_at
    }))
  ];
  
  // Map tools_used to commands (approximation)
  const commands: Command[] = Object.entries(data.tools_used).map(([tool, count]) => ({
    command: `Tool: ${tool} (used ${count} times)`,
    timestamp: data.updated_at
  }));
  
  return {
    id: data.session_id,
    agents,
    timestamp: data.created_at,
    status: data.session_active ? SessionStatus.Active : SessionStatus.Completed,
    files,
    commands,
    metadata: {
      title: data.session_title,
      prompts: data.prompts,
      errors: data.errors,
      notifications: data.notifications,
      tools_used: data.tools_used
    }
  };
}

/**
 * Session operations
 */
export function addAgent(session: Session, agent: Agent): Session {
  return {
    ...session,
    agents: [...session.agents, agent]
  };
}

export function addFileOperation(session: Session, operation: FileOperation): Session {
  return {
    ...session,
    files: [...session.files, operation]
  };
}

export function addCommand(session: Session, command: Command): Session {
  return {
    ...session,
    commands: [...session.commands, command]
  };
}

export function updateSessionStatus(session: Session, status: SessionStatus): Session {
  return {
    ...session,
    status,
    ...(status === SessionStatus.Completed || status === SessionStatus.Error
      ? { duration: Date.now() - new Date(session.timestamp).getTime() }
      : {})
  };
}

/**
 * Utilities
 */
function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default values
 */
export const DEFAULT_SESSION: Session = {
  id: '',
  agents: [],
  timestamp: new Date().toISOString(),
  status: SessionStatus.Active,
  files: [],
  commands: []
};