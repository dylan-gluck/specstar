# Spec⭐️

## Multi Session Observability TUI for Claude Code

An opinionated orchestration and observibility framework, designed to work with [Claude-code](https://github.com/anthropics/claude-code)

*Pronounced spec star, always written as specstar in lowercase.*

## Specstar Executable

Specstar is a TUI for multi-agent observibility and spec driven development (SDD).

The primary executable is `specstar` (also aliased as `ss` on install.)

The user can install globally using `npm`:

```bash
npm i -g specstar
```

### Settings JSON

```json
{
	"folders": [
		{
			"title": "Docs",
			"path": "docs"
		},
		{
			"title": "Specs",
			"path": "specs"
		},
		{
			"title": "Templates",
			"path": "templates"
		}
	]
}
```

### Commands

```
specstar          ->  Launch TUI
specstar --init   ->  Initialize in current directory
```

### Init

1. Creates directories: `.specstar/`, `.specstar/logs/`, `.specstar/sessions/`
2. Writes default settings: `.specstar/settings.json`
3. Writes hook script: `.specstar/hooks.ts`
4. Adds hook triggers to: `.claude/settings.json`

The session state json file is updated by a bun script (`bun run .specstar/hooks.ts <hook>`) which is triggered by claude-code hooks. On *specstar --init* the hook commands are configured in local claude hook settings.

*Once initialized, all claude-code session data will be automatically logged to the project sessions folder: `.specstar/sessions/{session-id}/state.json`*

#### State Management & Hook Commands

A core component of `specstar` is a state management system that is directly integrated with claude-code lifecycle events, "hooks".

For each hook, there is a matching argument handler in the script (`.specstar/hooks.ts <hook_name>`).

The specifications for each hook and the full state management system are documented in `docs/specstar-hooks.md`. **This spec must be followed exactly.**

The latest claude-code hooks documentation may be used for additional reference when writing the architecture plan & prd documents.
- `docs/vendor/cc-hooks-guide.md`
- `docs/vendor/cc-hooks-reference.md`

## TUI

Once installed, a user can run `specstar` in a project directory to launch the main TUI application.

*If initialization has not been completed, the user will be prompted to complete it.*

The `specstar` TUI has different *views*, toggled with keystrokes.

Global key-binds are available at all times. These are used to change views, exit program.

```markdown
Global key-binds:
[p] -> Change view: *Plan*
[o] -> Change view: *Observe*
[q] -> Quit
```

### Plan View

Main dashboard to view and create planning documents. Documents are recursively indexed, `fzf`, `jq`.

**Left column: (1/3)**

- Vertically stacked boxes, one box for each top-level folder defined in `.specstar/settings.json`.
- Each box lists it's content's in an expandable file-tree. Documents show their file extension, folders end with `/`
- Each box has a title with a shortcut key identified, (eg: `[1] Docs`, `[2] Specs`, ...).
- Pressing a shortcut key focuses the corresponding box. Pressing tab focuses the next box, shift+tab previous.
- User highlights elements using up/down arrows.
- Pressing enter on a document loads it into the document viewer.
- Pressing enter on a folder expands / collapses it.

**Right column: (2/3)**

- Document viewer. Fills height, overflow scroll (vertical).
- Selected documents are loaded, mardown contents rendered

**Key-binds**

```markdown
[up/down]  -> Cursor / selection movement
[enter]    -> Select document
```

## Observability View

Session observability dashboard

**Left column: (1/3)**

- List of all sessions, active and completed. Fills height, overflow scroll (vertical).
- Each session in the list displays it's Title, Id, and an indicator for Active/Suspended
- User highlights sessions using up/down arrows.
- Pressing enter on a session loads it into the session viewer.

**Right column: (2/3)**

- Session observility dashboard. Fills height, overflow scroll (vertical).
- Reads session state object and displays data in a dashboard style layout
- Live update when the JSON data is updated


**Key-binds**

```markdown
[up/down]  -> Cursor / selection movement
[enter]    -> Select session
```

The selected session data should be rendered in a dashboard style layout with tables and charts. The following design is just an example of layout, the final data output must reflect the state management system data model.

**Example Dashboard Layout**

```
  ╭──────────────────────────────────────────────────────────────────────── ╮
  │ {session_id}                {session_title}                 {is_active} │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ TEAMS                              │ ACTIVE AGENTS                      │
  │ ├─ Engineering ({eng_count})       │ • {active_agent_1} [{status}]      │
  │ │  └─ {eng_status}                 │ • {active_agent_2} [{status}]      │
  │ ├─ Product ({prod_count})          │ • {active_agent_3} [{status}]      │
  │ │  └─ {prod_status}                │ • {active_agent_4} [{status}]      │
  │ ├─ QA ({qa_count})                 │ • {active_agent_5} [{status}]      │
  │ │  └─ {qa_status}                  │                                    │
  │ └─ DevOps ({devops_count})         │ Load: {system_load}                │
  │    └─ {devops_status}              │ Tasks: {task_queue_length}         │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ EPIC: {epic_name}                           STORY: {story_id}           │
  │ ┌────────────────────────────────────────────────────────────────────┐  │
  │ │ Todo ({todo_count})  │ In Progress ({wip})  │ Done ({done_count})  │  │
  │ │ {todo_tasks}          │ {wip_tasks}          │ {done_tasks}        │  │
  │ └────────────────────────────────────────────────────────────────────┘  │
  │ Errors: {errors_count}  |  At Risk: {at_risk_count}                     │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ RECENT ACTIVITY                                                         │
  │ {timestamp_1} │ {event_1}                                               │
  │ {timestamp_2} │ {event_2}                                               │
  │ {timestamp_3} │ {event_3}                                               │
  ╰─────────────────────────────────────────────────────────────────────────╯
```

The dashboard must display this data in organized, human readable tables charts and lists that update in real time when the json changes.

---

## Current Build Status

**What has been done**
* Project has been initialized with `bun` and `ink`.
* Initial keybinds and state management have been implemented.
* Layout system has been implemented.
* Page view front-end has been mostly implemented

**Has has not been done**
* TUI: `PlanView` using placeholder data. We need to iterate over folders specified in `.specstar/settings.json` and index/list their contents.
* TUI: `PlanView` pressing enter should load selected document in the `MarkdownViewer`
* TUI: `ObserveView` layout and business logic. This is dependent on the session data which is not captured until we write the hook script.
* HOOKS: `.specstar/hooks.ts` script as described in `docs/specstar-hooks.md`
* INIT: Implement `specstar --init` function
