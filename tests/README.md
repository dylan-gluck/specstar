# Test Suite Organization

## Directory Structure

```
tests/
├── contract/       # Contract/behavior tests - what the system should do
├── unit/           # Unit tests - individual functions and modules
├── integration/    # Integration tests - components working together
├── e2e/            # End-to-end tests - full user workflows
└── setup.ts        # Test setup and utilities
```

## Test Categories

### Contract Tests (`/contract`)
Tests that verify the system meets its behavioral contracts and specifications:
- `list-render.test.ts` - UI list rendering contracts
- `observe-view.test.ts` - Observe view layout contracts
- `session-active.test.ts` - Session state validation contracts
- `settings.test.ts` - Settings validation contracts

### Unit Tests (`/unit`)
Tests for individual functions and modules in isolation:
- `settings.test.ts` - Settings model and functions

### Integration Tests (`/integration`)
Tests that verify multiple components work together correctly:
- `hooks.test.ts` - Hooks system lifecycle and tool tracking

### End-to-End Tests (`/e2e`)
Tests that simulate real user workflows from start to finish:
- `cli.test.ts` - Complete CLI command workflows (help, version, init)

## Running Tests

```bash
# Run all tests
bun test

# Run specific category
bun test tests/unit
bun test tests/integration
bun test tests/e2e

# Run specific file
bun test tests/e2e/cli.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Test Principles

1. **Contract tests** define expected behavior without implementation details
2. **Unit tests** verify individual functions work correctly in isolation
3. **Integration tests** ensure components interact properly
4. **E2E tests** validate complete user workflows

## Adding New Tests

- Place tests in the appropriate category based on scope
- Use descriptive test names that explain what is being tested
- Follow existing patterns for consistency
- Keep tests focused and independent