---
allowed-tools: Task, Read, Grep, Glob, LS
description: Analyze codebase with parallel agents focusing on specified scope or feature
argument-hint: <scope|feature>
---

# Context Prime

Perform comprehensive codebase analysis focusing on a specific scope or feature using three specialized agents working in parallel.

## Overview

This command deploys three parallel agents to analyze your codebase from different perspectives:
- **codebase-analyzer**: Deep structural and architectural analysis
- **codebase-locator**: Identifies key files and entry points
- **codebase-pattern-finder**: Discovers patterns, conventions, and practices

## Input

Your specified scope or feature: $ARGUMENTS

## Parallel Analysis Tasks

### Task 1: Codebase Analyzer
Perform deep structural analysis of the codebase focusing on: $ARGUMENTS

Analyze:
- Architecture and design patterns related to this scope
- Module dependencies and relationships
- Code organization and structure
- Technical debt and complexity hotspots
- Implementation approaches used

Output a comprehensive architectural analysis report.

### Task 2: Codebase Locator
Locate and map all relevant files and components for: $ARGUMENTS

Identify:
- Core implementation files
- Test files and coverage
- Configuration files
- Documentation and specs
- Entry points and interfaces
- Database schemas or models
- API endpoints or routes

Create a detailed file map with descriptions of each component's role.

### Task 3: Codebase Pattern Finder
Discover patterns and conventions used in: $ARGUMENTS

Find:
- Naming conventions and standards
- Common design patterns
- Error handling approaches
- Testing strategies
- Code style and formatting rules
- Reusable components or utilities
- Integration patterns

Document all discovered patterns with examples.

## Synthesis

After the parallel analysis completes:

1. **Integration Points**: Identify how the analyzed scope connects with other parts of the system
2. **Key Insights**: Highlight the most important findings from all three analyses
3. **Recommendations**: Suggest improvements or areas needing attention
4. **Quick Reference**: Create a summary card with:
   - Primary files to work with
   - Key patterns to follow
   - Important dependencies
   - Testing approach
   - Configuration locations

## Expected Output

A comprehensive analysis report containing:
- Architectural overview from the analyzer
- Complete file mapping from the locator
- Pattern documentation from the pattern finder
- Synthesized insights and recommendations
- Quick reference guide for working with this scope

## Constraints

- Focus analysis specifically on the provided scope/feature
- Maintain parallel execution for efficiency
- Provide actionable insights, not just observations
- Include code examples where relevant
- Keep recommendations practical and specific
