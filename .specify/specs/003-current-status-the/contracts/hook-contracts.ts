/**
 * Hook Contracts for Specstar TUI Bug Fixes
 * 
 * These contracts define the expected behavior of Claude Code hooks
 * and their interaction with session state management.
 */

// ============================================================================
// HOOK INPUT CONTRACTS
// ============================================================================

/**
 * Base hook input structure
 */
export interface HookInput {
  hook_type: string;
  session_id: string;
  timestamp: string;  // ISO 8601
  [key: string]: any; // Additional hook-specific data
}

/**
 * Session lifecycle hooks - ONLY these can modify session_active
 */
export interface SessionStartHook extends HookInput {
  hook_type: 'session_start';
  source?: string;
}

export interface SessionEndHook extends HookInput {
  hook_type: 'session_end';
  reason?: string;
}

/**
 * Non-lifecycle hooks - MUST NOT modify session_active
 */
export interface ToolUseHook extends HookInput {
  hook_type: 'tool_use';
  tool_name: string;
  parameters?: any;
}

export interface FileOperationHook extends HookInput {
  hook_type: 'file_read' | 'file_write' | 'file_edit';
  file_path: string;
  operation: 'read' | 'write' | 'edit';
}

export interface AgentHook extends HookInput {
  hook_type: 'agent_start' | 'agent_complete';
  agent_id: string;
  agent_type?: string;
}

// ============================================================================
// STATE MUTATION CONTRACTS
// ============================================================================

/**
 * Contract for session_active state mutations
 * CRITICAL: Only session_start and session_end may modify this field
 */
export class SessionActiveContract {
  /**
   * Validates that a hook is allowed to modify session_active
   */
  static canModifySessionActive(hookType: string): boolean {
    return hookType === 'session_start' || hookType === 'session_end';
  }

  /**
   * Gets the expected session_active value for a hook
   */
  static getExpectedActiveState(hookType: string): boolean | null {
    switch (hookType) {
      case 'session_start':
        return true;
      case 'session_end':
        return false;
      default:
        return null; // Should not modify
    }
  }

  /**
   * Validates a state mutation
   */
  static validateMutation(
    hookType: string,
    previousState: boolean,
    newState: boolean
  ): { valid: boolean; error?: string } {
    if (!this.canModifySessionActive(hookType)) {
      if (previousState !== newState) {
        return {
          valid: false,
          error: `Hook type '${hookType}' is not allowed to modify session_active`
        };
      }
      return { valid: true };
    }

    const expected = this.getExpectedActiveState(hookType);
    if (expected !== null && newState !== expected) {
      return {
        valid: false,
        error: `Hook type '${hookType}' must set session_active to ${expected}`
      };
    }

    return { valid: true };
  }
}

// ============================================================================
// UI CONTRACTS
// ============================================================================

/**
 * Contract for Settings structure
 */
export interface SettingsContract {
  startPage: 'plan' | 'observe' | 'help';
  theme: {
    bg: string;
    fg: string;
    fgAccent: string;
  };
  folders: {
    config: string;
    logs: string;
    cache: string;
    // sessionPath is intentionally omitted - hardcoded
  };
  features: {
    autoRefresh: boolean;
    darkMode: boolean;
    sessionMonitoring: boolean;
  };
}

/**
 * Contract for list item rendering
 */
export interface ListItemRenderContract {
  // Input
  item: {
    id: string;
    label: string;
    isActive?: boolean;
  };
  isSelected: boolean;
  theme: SettingsContract['theme'];

  // Output
  render(): {
    textColor: string;      // Must be theme.fgAccent when selected, theme.fg otherwise
    backgroundColor: string; // Must always be 'transparent' or undefined
    prefix: string;         // Must be '● ' for active, '  ' for inactive
    prefixColor: string;    // Must be 'green' for active
    emoji: null;           // Must never include emojis
  };
}

/**
 * Contract for scrollable lists
 */
export interface ScrollableListContract {
  items: any[];
  viewportHeight: number;
  selectedIndex: number;

  // Computed properties
  scrollOffset: number;      // First visible item index
  visibleItems: any[];       // Items currently in viewport
  canScrollUp: boolean;
  canScrollDown: boolean;

  // Methods
  scrollTo(index: number): void;
  ensureVisible(index: number): void;
}

// ============================================================================
// VIEW CONTRACTS
// ============================================================================

/**
 * Contract for Observe View layout
 */
export interface ObserveViewContract {
  layout: {
    leftPanel: {
      width: string;  // Must be '30%'
      minWidth: number; // Minimum 20 characters
      content: 'SessionList';
    };
    rightPanel: {
      width: string;  // Must be '70%'
      content: 'SessionDashboard' | 'EmptyState';
    };
  };

  // Session list requirements
  sessionList: {
    sessions: Array<{
      id: string;
      title: string;
      isActive: boolean;
      indicator: '●' | ' ';
    }>;
    selectedId: string | null;
    onSelect: (id: string) => void;
  };

  // Dashboard requirements
  dashboard: {
    sessionId: string;
    sections: [
      'identity',
      'status',
      'agents',
      'files',
      'tools'
    ];
    data: Record<string, any>;
  };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Test helper to verify hook behavior
 */
export function testHookCompliance(
  hook: HookInput,
  previousState: any,
  newState: any
): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check session_active compliance
  if ('session_active' in previousState && 'session_active' in newState) {
    const validation = SessionActiveContract.validateMutation(
      hook.hook_type,
      previousState.session_active,
      newState.session_active
    );
    
    if (!validation.valid) {
      errors.push(validation.error!);
    }
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

/**
 * Test helper to verify settings structure
 */
export function testSettingsCompliance(
  settings: any
): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!settings.startPage || !['plan', 'observe', 'help'].includes(settings.startPage)) {
    errors.push('startPage must be one of: plan, observe, help');
  }

  if (!settings.theme || typeof settings.theme !== 'object') {
    errors.push('theme must be an object');
  } else {
    if (!settings.theme.bg) errors.push('theme.bg is required');
    if (!settings.theme.fg) errors.push('theme.fg is required');
    if (!settings.theme.fgAccent) errors.push('theme.fgAccent is required');
  }

  // Check forbidden fields
  if (settings.folders?.sessionPath) {
    errors.push('sessionPath must not be configurable');
  }

  return {
    passed: errors.length === 0,
    errors
  };
}