# Specstar Constitution

## Core Principles

### 0. Testing Strategy

* WE ARE NOT TDD, but testing is important. Spend about 80% on code and 20% on tests.
* Ensure that tests are modular and focused on specific functionality.
* Use a consistent testing framework and follow best practices for test organization.
* Add pre-commit hooks to ensure code quality and consistency.

### I. Separation of Concerns

* Provide Lightweight, Performant, Clean architectural code.
* You should always work with clearly separated, minimal and targeted solutions that prioritize clean architecture over feature complexity.
* Maintain strict separation of concerns across modules, ensuring each component has a single, well-defined responsibility.
* Work with modular project layout and centralized main module, SoC is critical for project flexibility.

### II. Simple, Clean Code

* Preserve code readability and maintainability as primary concerns, ensuring that any performance improvements don't sacrifice code clarity.
* Resist feature bloat and complexity creep by consistently asking whether each addition truly serves the core purpose.
* Files should never exceed 250 lines, if it were to exceed, the file must be split into 2 or 3 clearly separated concerned files that fit into the minimal and modular architecture.

### III. Consistency is Key

* Utilize the existing configurations, follow project architecture deterministically, surgical modification, minimal targeted implementations.
* Reuse any functions already defined, do not create redundant code.
* Ensure naming conventions are retained for existing code.
* Avoid using comments in code, the code must be self-explanatory.
* Ensure KISS and DRY principles are expertly followed.

### IV. Communication

* Agents MUST always write a concise summary of their work in `memory/devlog/`
* Ensure clear communication about what has changed, lessons learned, known bugs.
* After each story, code is committed with a short clear message.
* After each epic passes QA & is merged into main, scrummaster/architect update long-term docs.
