#!/usr/bin/env node
import { withFullScreen } from "fullscreen-ink";
import meow from "meow";
import App from "./app.tsx";

const cli = meow(
  `
	Usage
	  $ ss
`,
  {
    importMeta: import.meta,
    flags: {
      init: {
        type: "boolean",
      },
    },
  }
);

const ink = withFullScreen(<App />);

await ink.start();

await ink.waitUntilExit();
