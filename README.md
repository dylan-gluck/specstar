# SPECSTAR

Collaborative spec-driven development
* Codebase context, project memory, constitution
* Connect to Linear(issues), Github(prs), Notion(plans,specs)
* Refine tickets from descriptions of tasks / issues
* Draft specs + plan from tickets requirements
* Run isolated agent sessions in background workers, worktrees

## Dependencies:
Must have `bun` and `omp` installed and configured.
* [Bun](https://github.com/oven-sh/bun) runtime
* [Oh-my-pi](https://github.com/can1357/oh-my-pi) coding agent

## Stack:
* Bun [workers](https://bun.com/docs/runtime/workers)
* Bun [JSONL](https://bun.com/docs/runtime/jsonl#bun-jsonl-parsechunk)
* Bun [SQLite](https://bun.com/docs/runtime/sqlite)
* OpenTUI with Solidjs [bindings](https://opentui.com/docs/bindings/solid/)
* Oh-my-pi [SDK](https://github.com/can1357/oh-my-pi/blob/main/docs/sdk.md)
* Oh-my-pi [RPC](https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md)
* Types to [JSON Schema](https://github.com/YousefED/typescript-json-schema) or [alternative](https://github.com/vega/ts-json-schema-generator)

## Build Script
Bun [build](https://bun.com/docs/bundler) + Solid plugin
```ts
import solidPlugin from "@opentui/solid/bun-plugin"

await Bun.build({
  entrypoints: ["./index.tsx"],
  plugins: [solidPlugin],
  compile: {
    target: "bun-darwin-arm64",
    outfile: "./specstar",
  },
})
```
