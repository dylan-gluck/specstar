# Data Model: Technical Debt Cleanup

## Overview
This cleanup task focuses on code removal rather than new data structures. The existing data models remain unchanged.

## Preserved Data Models

### SessionData (Unchanged)
```typescript
interface SessionData {
  id: string;
  session_id?: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  project?: string;
  user?: string;
  files?: {
    new?: string[];
    edited?: string[];
    read?: string[];
  };
  created_at: string;
  updated_at: string;
}
```

### SpecstarConfig (Primary - from ConfigManager)
```typescript
interface SpecstarConfig {
  version: string;
  startPage: 'plan' | 'observe';
  folders: {
    sessions: string;
    claude: string;
    documents?: string;
  };
  features?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  };
}
```

### Deprecated Models (To Remove)

#### SpecstarSettings (from settings-loader)
```typescript
// DEPRECATED - uses old sessionPath field
interface SpecstarSettings {
  version: string;
  sessionPath: string;  // <-- deprecated field
  claudePath?: string;
  documentsPath?: string;
}
```

## Component Extraction Models

### Extracted UI Components

#### SessionDashboard Props
```typescript
interface SessionDashboardProps {
  session: SessionData;
  stats?: SessionStats;
  width: number;
  height: number;
}
```

#### EmptyState Props
```typescript
interface EmptyStateProps {
  message: string;
  width: number;
  height: number;
}
```

## Removal Tracking

### Files to Remove
```typescript
interface RemovalEntry {
  path: string;
  lines: number;
  reason: 'unused' | 'duplicate' | 'obsolete' | 'broken';
  dependencies: string[];  // Files that import this
}

const removals: RemovalEntry[] = [
  // Service CLIs
  {
    path: '/src/lib/session-monitor/cli.ts',
    lines: 459,
    reason: 'unused',
    dependencies: []
  },
  {
    path: '/src/lib/document-viewer/cli.ts',
    lines: 400, // estimated
    reason: 'unused',
    dependencies: []
  },
  {
    path: '/src/lib/config-manager/cli.ts',
    lines: 400, // estimated
    reason: 'unused',
    dependencies: []
  },
  {
    path: '/src/lib/hook-integrator/cli.ts',
    lines: 400, // estimated
    reason: 'unused',
    dependencies: []
  },
  
  // Hook-integrator
  {
    path: '/src/lib/hook-integrator/',
    lines: 2642,
    reason: 'unused',
    dependencies: ['src/index.ts (commented)', 'src/lib/session-monitor/index.ts']
  },
  
  // Redundant watchers
  {
    path: '/src/lib/session-monitor/watcher.ts',
    lines: 637,
    reason: 'duplicate',
    dependencies: ['tests only']
  },
  {
    path: '/src/lib/session-monitor/session-watcher.ts',
    lines: 172,
    reason: 'duplicate',
    dependencies: []
  },
  
  // Settings loader
  {
    path: '/src/lib/config/settings-loader.ts',
    lines: 82,
    reason: 'duplicate',
    dependencies: ['src/app.tsx']
  }
];
```

## Build Configuration Changes

### package.json Scripts (Before)
```json
{
  "scripts": {
    "build": "bun run build:main && bun run build:libs",
    "build:main": "bun build --compile --outfile=dist/specstar src/cli.tsx",
    "build:libs": "bun run build:session-monitor && bun run build:document-viewer && bun run build:hook-integrator && bun run build:config-manager",
    "build:session-monitor": "...",
    "build:document-viewer": "...",
    "build:hook-integrator": "...",
    "build:config-manager": "..."
  }
}
```

### package.json Scripts (After)
```json
{
  "scripts": {
    "build": "bun build --compile --outfile=dist/specstar src/cli.tsx",
    "compile": "bun run build"
  }
}
```

## State Transitions

### Cleanup Process States
```
1. INITIAL → Codebase with 15,000+ lines
2. REMOVE_CLIS → Remove service CLI files
3. REMOVE_UNUSED → Remove hook-integrator, watchers
4. CONSOLIDATE → Migrate to ConfigManager
5. EXTRACT → Extract UI components
6. CLEAN_TESTS → Remove broken tests
7. VALIDATED → ~10,000 lines, all tests passing
```

## Validation Rules

1. **No Breaking Changes**: All existing functionality must work
2. **File Size Limit**: No file exceeds 250 lines
3. **Test Coverage**: Remaining tests must pass
4. **Build Success**: `bun run build` produces working executable
5. **Init Works**: `specstar --init` creates hooks.ts correctly
6. **UI Renders**: All views display properly

## Migration Requirements

### App.tsx Migration
```typescript
// Before
import { loadSettings } from './lib/config/settings-loader';
const settings = await loadSettings();

// After  
import { ConfigManager } from './lib/config-manager';
const settings = await ConfigManager.load();
```

### Component Imports
```typescript
// Before (all in ObserveView.tsx)
const SessionDashboard = React.memo(...);
const EmptyState = (...);

// After
import { SessionDashboard } from '../components/session-dashboard';
import { EmptyState } from '../components/empty-state';
```