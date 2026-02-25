# Specstar

TUI for collaborative SDD and async agent workflow orchestration. Built using the the `omp` agent harness.

### Approach

_Mirroring How Teams Work_

Engineering teams scope and track work with tickets or `issues` which generally are tagged in the name of a `branch` for automatic linking to published `PRs`. In the lifecycle of an issue an engineer may make many `commits` to a branch (original changes, code-review feedback); similarly, there may be multiple agentic `sessions` associated with an issue/branch during development.

_Create Issues with Codebase Context_

In terms of scope issues should generally be individually testable and contained in one feature branch; Larger features may be broken down into `subtasks`, equivalent to `commits` on the branch. Every issue requires a clear description, requirements and ACs. The technical `specs` for an issue describe the implementation details, system design and data-model/contract changes needed to satisfy the requirements within the context of the codebase.

_Problems -> Solutions_

- Issues that don't capture enough detail or include clear requirements, scope creep, confused/frustrated engineers:
  - Integrated `workflows` for capturing & refining tickets with project context and memory.
  - Generate reports from completed `cycles`; track projects, `milestones`, team contributions.
  - Plan for upcoming releases; update changelog, generate docs, security scan
- Engineers spending hours drafting a single PRD/spec/prompt, babysitting a single agent and approving every tool use:
  - Quickly capture issues: Async workers refine and draft requirements -> Added to `needs attention` queue for HITL approvals
  - Centralized specifications: Technical implementation docs written to a shared Notion workspace
- Large complicated pull requests, engineers having a hard time reviewing PRs or understanding technical decisions.
  - End-to-end observability trace of changes: issue with clear requirements, detailed technical specs, feature branch + commits, PR, agent session logs.

_Backends_

- Issues (Linear, Github)
- Specs (Notion)
- PRs (Github)

### Project Config

- `.specstar/settings.json`
  - linear_key
  - notion_key
  - github_repo
  - worktree_dir
- `.specstar/memory/`
  - project.jsonl
  - people.jsonl
  - glossary.jsonl
- `.specstar/workflows/`
  - refine_issue.json
  - capture_issue.json
  - plan_cycle.json
  - ...
- `.specstar/sessions/`
- `.specstar/cache.db`

### Entity Relationships

**Detailed:**

- Project `.specstar/` dir has:
  - Settings.json (linear_id, notion_id, github_repo)
  - Workflows (id, name, type, steps)
  - Cache (issues, sessions, worktrees)
  - Session Logs
  - Memory
    - Project (name, summary, memory)
    - People (name, email, summary)
    - Glossary (term, clients, projects)
- Linear workspace has:
  - Issues, Cycles, Projects, Milestones
- Issues have:
  - Linear Details (description, comments, linear_assignee, cycle, status, branch_id)
  - Notion Specs (document_title, document_id)
  - Github branch
    - PR (status, title, description, comments)
- Tracked Issues (db) have:
  - Summary (overview, reqs, status, changes)
  - Worktree (id, path, branch)
  - Sessions (id, status, branch, worktree_id, workflow_id)
  - Issue Data (Linear, Github, Notion)

**Simple:**

- -> Git repo
  - -> Local clone
    - -> Specstar config
  - -> Local worktrees
- -> Linear workspace
  - -> Project
    - -> Milestone
      - -> Issue
  - -> Cycle
    - -> Issue
    - -> Stats
  - -> Issue
    - -> Title
    - -> Branch
      - -> PR Status
    - -> Description
      - -> Requirements
      - -> ACs
      - -> Specs
    - -> Tags
    - -> Assignee
    - -> Issue Status
- -> Notion workspace
  - -> Spec document
    - -> Comments
    - -> Status (pending, approved, denied)
