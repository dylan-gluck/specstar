const proc = Bun.spawn(
  [
    "bunx",
    "ts-json-schema-generator",
    "--path",
    "specs/001-issue-centric-tui/contracts/config.ts",
    "--type",
    "SpecstarConfig",
    "--tsconfig",
    "tsconfig.json",
    "-o",
    "specstar.schema.json",
  ],
  {
    stdout: "inherit",
    stderr: "inherit",
  },
);

const exitCode = await proc.exited;
if (exitCode !== 0) {
  console.error("Schema generation failed");
  process.exit(1);
}
console.log("Schema written to specstar.schema.json");
