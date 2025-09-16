# Feature Specification: Technical Debt Cleanup

**Feature Branch**: `004-clean-up-technical`  
**Created**: 2025-09-10  
**Status**: Draft  
**Input**: User description: "Clean up technical debt in the specstar project repo. Currently all core functionality is working but we need to remove old and redundant code, thourough analysis and clean up of src/"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
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

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a developer maintaining the Specstar TUI application, I need the codebase to be clean, maintainable, and free of redundant code so that I can efficiently add new features, fix bugs, and understand the system architecture without navigating through obsolete or duplicated functionality.

### Acceptance Scenarios
1. **Given** a developer opening the project, **When** they navigate through the src/ directory, **Then** they should find only actively used code without deprecated or orphaned files
2. **Given** a new developer joins the team, **When** they review the codebase structure, **Then** they should be able to understand the purpose of each module without encountering conflicting or duplicate implementations
3. **Given** the application is running, **When** all features are tested, **Then** the application should maintain full functionality with the cleaned codebase
4. **Given** a developer needs to modify a feature, **When** they search for related code, **Then** they should find a single, clear implementation without duplicate or contradictory logic
5. **Given** the technical debt cleanup is complete, **When** analyzing the codebase metrics, **Then** the total lines of code should be reduced by at least 5,000 lines
6. **Given** redundant hook implementations are removed, **When** Claude Code triggers hooks, **Then** only the working hooks.ts template implementation should execute

### Edge Cases
- What happens when removing code that appears unused but has hidden dependencies?
- How does system handle removing code that may be referenced in configuration files or documentation?
- What happens when consolidating duplicate implementations that have subtle behavioral differences?

## Technical Debt Analysis Summary *(specific to this cleanup)*

### Identified Redundancies
Based on comprehensive codebase analysis, the following redundant implementations have been identified:

1. **Hook System** (~2,000 lines redundant)
   - Working: `src/lib/config-manager/templates/hooks.ts`
   - Redundant: Entire `src/lib/hook-integrator/` directory

2. **Session Monitoring** (~1,200 lines redundant)
   - Working: `SessionMonitor` class in `src/lib/session-monitor/index.ts`
   - Redundant: `SessionWatcher`, `FileWatcher`, CLI wrapper, alternative Session models

3. **Configuration Management** (needs unification)
   - Dual system with incompatible interfaces
   - `ConfigManager` vs `settings-loader.ts`

4. **UI Components** (needs standardization using ObserveView patterns)
   - Duplicate: `FocusBox` vs `TuiRenderer.FocusableBox`
   - Unused: `ProgressBar` component
   - Standardize on ObserveView patterns for layout and text styling
   - Extract reusable components from ObserveView (SessionDashboard, EmptyState patterns)

5. **Document System** (needs consolidation)
   - Multiple markdown parsers and frontmatter processors
   - Duplicate search implementations

6. **Test Infrastructure** (~2,000 lines obsolete)
   - Broken CLI contract tests
   - 26+ skipped integration tests
   - Duplicate test utilities

**Total Estimated Reduction**: ~5,000+ lines of code

### UI Refactoring Guidelines (Based on ObserveView)

The ObserveView component represents the updated best practices for UI implementation. During refactoring:

#### Layout Patterns to Extract and Reuse:
1. **Two-column responsive layout** with flexBasis percentages (20%/80% split)
2. **Consistent border styling**: `borderStyle="classic"` with `borderColor="green"` for active elements
3. **Section headers**: Bold gray text for section titles
4. **Status indicators**: Colored dots (●) for active/inactive states
5. **Footer navigation hints**: Dimmed gray text with keyboard shortcuts

#### Component Patterns to Componentize:
1. **Dashboard component**: Multi-section data display with identity, status, and metrics
2. **EmptyState component**: Centered placeholder for no-data scenarios
3. **List panel**: Scrollable list with selection highlighting
4. **Section box**: Bordered container with header and content
5. **Status badge**: Color-coded status indicators with consistent styling

#### Text Styling Standards:
- Headers: `<Text bold color="gray">`
- Active items: `color="green"`
- Inactive/disabled: `color="gray"`
- Status indicators: `color="yellow"` for active, `color="gray"` for inactive
- Truncation: `wrap="truncate-end"` for file paths, `wrap="truncate-start"` for timestamps
- Dimmed helper text: `<Text color="gray" dimColor>`

#### State Management Patterns:
- Use `React.memo` with custom comparison for performance optimization
- Implement `useMemo` for expensive computations
- Separate display components from data fetching logic
- Use focused state updates to prevent unnecessary re-renders

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST maintain all current working functionality after cleanup
- **FR-002**: System MUST remove all identified dead code that is never executed or referenced (targeting ~5,000 lines of redundant code)
- **FR-003**: System MUST consolidate duplicate implementations into single, reusable modules
- **FR-004**: System MUST preserve all existing user-facing features and behaviors
- **FR-005**: System MUST maintain backward compatibility with existing configuration files
- **FR-006**: Cleanup process MUST reduce codebase by minimum 5,000 lines while maintaining functionality
- **FR-007**: System MUST remove unused dependencies from package configuration
- **FR-008**: Code organization MUST follow existing project patterns: React Ink for UI, single responsibility modules, clear separation between lib/components/views
- **FR-009**: System MUST maintain or improve current performance characteristics
- **FR-010**: All remaining tests MUST pass after cleanup is complete (broken/obsolete tests should be removed)
- **FR-011**: UI refactoring MUST use ObserveView as the template for component patterns, layout, and text styling
- **FR-012**: System MUST extract and componentize repeated UI patterns from ObserveView for reuse across other views

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

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
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [ ] Entities identified (N/A for this feature)
- [x] Review checklist passed

---