# Feature Specification: Bug Fixes for Specstar TUI

**Feature Branch**: `003-current-status-the`  
**Created**: 2025-09-09  
**Status**: Draft  
**Input**: User description: "Current Status: * The specstar project has completed two sprints. * The hook system is mostly working as expected * The TUI structure is mostly correct I have documented 5 bugs that must be addressed."

## Execution Flow (main)

```
1. Parse user description from Input
   → Five documented bugs need fixing in specstar TUI
2. Extract key concepts from description
   → Identified: TUI bugs, session management, configuration, UI display
3. For each unclear aspect:
   → Theme object structure defined: {bg, fg, fgAccent}
4. Fill User Scenarios & Testing section
   → User flows for each bug fix identified
5. Generate Functional Requirements
   → Each bug fix requirement is testable
6. Identify Key Entities (if data involved)
   → Session state, configuration settings, UI components
7. Run Review Checklist
   → All requirements are now clear and testable
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a developer using Specstar TUI, I want the application to behave correctly and consistently so that I can effectively monitor Claude Code sessions and view planning documents without encountering confusing behaviors or incorrect state management.

### Acceptance Scenarios

1. **Given** a Claude Code session is running, **When** session hooks are triggered, **Then** the session_active state should only change on session_start and session_end hooks
2. **Given** the TUI is launched, **When** no startPage is configured, **Then** the application should open to the help page by default
3. **Given** a startPage is configured, **When** the TUI is launched, **Then** the application should open to the specified page (plan, observe, or help)
4. **Given** a list view with many items, **When** the list exceeds the parent box height, **Then** the list should scroll properly without overflow
5. **Given** the observe view is open, **When** viewing sessions, **Then** a green dot indicator should show next to active sessions
6. **Given** a session is selected in observe view, **When** pressing enter, **Then** session details should display in a dashboard layout in the right column

### Edge Cases

- What happens when session_active is incorrectly set to false during an active session?
- How does system handle invalid startPage configuration values?
- What happens when theme configuration contains invalid color values?
- How does the system handle extremely long lists (100+ items)?
- What happens when session data is corrupted or incomplete?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST only update session_active state via session_start and session_end hooks
- **FR-002**: System MUST NOT set session_active to false on any other hooks besides session_end
- **FR-003**: System MUST support a configurable startPage setting with values "plan", "observe", or "help"
- **FR-004**: System MUST open to the configured startPage on launch, defaulting to "help" if not set
- **FR-005**: System MUST remove the sessionPath configuration option as it should not be customizable
- **FR-006**: System MUST accept theme configuration as an object with properties: bg (background color), fg (foreground color), and fgAccent (accent foreground color)
- **FR-007**: System MUST apply theme configuration to the TUI appearance
- **FR-008**: System MUST display highlighted list items with green text instead of green background
- **FR-009**: System MUST NOT display emojis in list items
- **FR-010**: System MUST enable scrolling for lists that exceed their parent container
- **FR-011**: System MUST display a session list in the left sidebar of observe view
- **FR-012**: System MUST show a green dot indicator next to active sessions
- **FR-013**: System MUST allow users to select sessions with enter key to view details
- **FR-014**: System MUST display session details in a dashboard layout in the right column
- **FR-015**: System MUST show all session state data including: session id, title, active status, agent states, file operations, and tool counts

### Key Entities

- **Session State**: Represents the current state of a Claude Code session including active status, id, title, and activity metrics
- **Configuration Settings**: User preferences including startPage and theme configuration
- **Session List**: Collection of all available sessions with their status indicators
- **Session Details**: Comprehensive dashboard view of a selected session's complete state data

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---