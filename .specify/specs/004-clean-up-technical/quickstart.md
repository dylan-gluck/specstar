# Quickstart: Validating Technical Debt Cleanup

## Prerequisites
- Bun installed
- Git repository with clean working tree
- Backup branch created: `git checkout -b backup-before-cleanup`

## Phase 1: Pre-Cleanup Baseline

### 1. Record Current Metrics
```bash
# Count total lines of code
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
# Expected: ~15,000 lines

# Check dist size
du -sh dist/
# Expected: ~300MB (5 executables)

# Run existing tests
bun test
# Note: Many will be skipped
```

### 2. Test Current Functionality
```bash
# Build the project
bun run build

# Test main executable
./dist/specstar --help
./dist/specstar --version

# Initialize in test directory
mkdir /tmp/test-specstar && cd /tmp/test-specstar
/path/to/dist/specstar --init

# Verify hooks.ts was created
ls -la .specstar/hooks.ts

# Return to project
cd /path/to/specstar
```

## Phase 2: Progressive Cleanup Validation

### Step 1: After Removing Service CLIs
```bash
# Clean and rebuild
rm -rf dist/
bun run build

# Verify only specstar executable exists
ls -la dist/
# Expected: Only 'specstar' file (~64MB)

# Test main functionality still works
./dist/specstar --help
```

### Step 2: After Removing Hook-integrator
```bash
# Verify hook-integrator directory is gone
ls src/lib/hook-integrator
# Expected: No such file or directory

# Check imports are cleaned
grep -r "hook-integrator" src/
# Expected: No results

# Build and test
bun run build
./dist/specstar --init
```

### Step 3: After Consolidating Config
```bash
# Test config loading
bun run src/cli.tsx --init

# Verify settings.json uses correct schema
cat .specstar/settings.json | jq .folders
# Expected: folders object with sessions and claude paths

# Run the TUI
bun run dev
# Navigate between Plan and Observe views
```

### Step 4: After Extracting Components
```bash
# Verify component files exist
ls -la src/components/
# Expected: session-dashboard.tsx, empty-state.tsx

# Check file sizes
wc -l src/views/observe-view.tsx
# Expected: < 250 lines

wc -l src/components/session-dashboard.tsx
# Expected: < 250 lines

# Test UI rendering
bun run dev
# Verify Observe view still displays correctly
```

### Step 5: After Cleaning Tests
```bash
# Run all tests
bun test

# Verify no skipped tests in output
bun test 2>&1 | grep -i skip
# Expected: No results

# Check test coverage
bun test --coverage
```

## Phase 3: Final Validation

### 1. Metrics Comparison
```bash
# Count final lines of code
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
# Expected: ~10,000 lines (≥33% reduction)

# Check final dist size
du -sh dist/
# Expected: ~64MB (1 executable)

# Verify build time improvement
time bun run build
# Expected: Faster than before
```

### 2. Full Functionality Test
```bash
# Clean install and build
rm -rf node_modules dist
bun install
bun run build

# Test in fresh directory
rm -rf /tmp/test-specstar
mkdir /tmp/test-specstar && cd /tmp/test-specstar

# Initialize
/path/to/dist/specstar --init

# Start a mock Claude session
mkdir -p .claude/sessions
echo '{"session_id": "test", "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > .claude/sessions/test.json

# Run specstar
/path/to/dist/specstar

# Test each view:
# - Press 'p' for Plan view (should show documents)
# - Press 'o' for Observe view (should show session)
# - Press 'q' to quit
```

### 3. Integration Test
```bash
# Test with real Claude Code session
cd ~/your-actual-project

# Install specstar
cp /path/to/dist/specstar /usr/local/bin/
specstar --init

# Edit hooks to integrate with Claude
vi .specstar/hooks.ts

# Start Claude Code and verify integration
# Monitor should update in real-time
```

## Success Criteria

✅ **Build**: `bun run build` completes without errors
✅ **Size**: dist/ contains only one 'specstar' executable
✅ **Lines**: Total LOC reduced by ≥5,000 lines
✅ **Tests**: All remaining tests pass (no skipped)
✅ **Init**: `specstar --init` creates proper structure
✅ **UI**: Both Plan and Observe views render correctly
✅ **Config**: Settings load with correct schema
✅ **Hooks**: hooks.ts template works with Claude Code
✅ **Performance**: No degradation in runtime performance

## Troubleshooting

### If build fails
```bash
# Check for unresolved imports
bun build --compile --target=node src/cli.tsx 2>&1 | grep "Cannot find"

# Verify all imports updated
grep -r "settings-loader" src/
grep -r "hook-integrator" src/
```

### If UI doesn't render
```bash
# Check component imports
grep -r "SessionDashboard" src/views/

# Verify components exported
cat src/components/session-dashboard.tsx | grep "export"
```

### If tests fail
```bash
# Run specific test file
bun test path/to/failing.test.ts

# Check if test is for removed code
# If yes, remove the test file
```

## Rollback Plan

If issues arise:
```bash
# Stash current changes
git stash

# Return to backup
git checkout backup-before-cleanup

# Or selectively revert
git checkout HEAD -- src/lib/hook-integrator  # Restore directory
git checkout HEAD -- package.json  # Restore build scripts
```
