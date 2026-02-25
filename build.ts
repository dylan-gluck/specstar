import pkg from "./package.json";

import solidPlugin from "@opentui/solid/bun-plugin";

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  plugins: [solidPlugin],
  compile: {
    outfile: "./dist/specstar",
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const msg of result.logs) {
    console.error(msg);
  }
  process.exit(1);
}

console.log("Build complete: ./dist/specstar");
