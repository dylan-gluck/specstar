import { describe, test, expect, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import {
  loadConfig,
  DEFAULT_SESSIONS_CONFIG,
  DEFAULT_KEYBINDINGS,
} from "../../src/config.js";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `specstar-config-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("config", () => {
  const savedEnv: Record<string, string | undefined> = {};

  function saveEnv(...keys: string[]) {
    for (const k of keys) savedEnv[k] = process.env[k];
  }

  function clearEnv(...keys: string[]) {
    for (const k of keys) delete process.env[k];
  }

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    // Reset for next test
    for (const k of Object.keys(savedEnv)) delete savedEnv[k];
  });

  // ---------------------------------------------------------------------------
  // DEFAULT_SESSIONS_CONFIG
  // ---------------------------------------------------------------------------

  describe("DEFAULT_SESSIONS_CONFIG", () => {
    test("has expected shape", () => {
      expect(DEFAULT_SESSIONS_CONFIG.model).toBe("claude-sonnet");
      expect(DEFAULT_SESSIONS_CONFIG.thinkingLevel).toBe("high");
      expect(DEFAULT_SESSIONS_CONFIG.maxConcurrent).toBe(8);
      expect(DEFAULT_SESSIONS_CONFIG.worktreeBase).toBe("../worktrees");
    });
  });

  // ---------------------------------------------------------------------------
  // DEFAULT_KEYBINDINGS
  // ---------------------------------------------------------------------------

  describe("DEFAULT_KEYBINDINGS", () => {
    test("has all expected keys", () => {
      const expectedKeys = [
        "togglePane",
        "openCommandPalette",
        "refreshAll",
        "quit",
        "selectUp",
        "selectDown",
        "primaryAction",
        "tabNext",
        "tabPrev",
        "approve",
        "deny",
        "newSession",
        "comment",
        "openExternal",
        "refreshCard",
      ];
      for (const key of expectedKeys) {
        expect(DEFAULT_KEYBINDINGS).toHaveProperty(key);
      }
    });

    test("has correct specific defaults", () => {
      expect(DEFAULT_KEYBINDINGS.togglePane).toBe("tab");
      expect(DEFAULT_KEYBINDINGS.quit).toBe("ctrl+q");
      expect(DEFAULT_KEYBINDINGS.openCommandPalette).toBe("/");
    });
  });

  // ---------------------------------------------------------------------------
  // loadConfig
  // ---------------------------------------------------------------------------

  describe("loadConfig", () => {
    test("returns defaults when no config files exist", () => {
      const tmp = makeTmpDir();
      saveEnv("SPECSTAR_CONFIG_FILE");
      clearEnv("SPECSTAR_CONFIG_FILE");

      try {
        const config = loadConfig(tmp);
        expect(config.sessions).toEqual(DEFAULT_SESSIONS_CONFIG);
        expect(config.keybindings).toEqual(DEFAULT_KEYBINDINGS);
        expect(config.workflowDirs).toEqual([]);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test("loads explicit config file via SPECSTAR_CONFIG_FILE env var", () => {
      const tmp = makeTmpDir();
      const configPath = join(tmp, "custom-config.json");
      writeFileSync(
        configPath,
        JSON.stringify({ sessions: { model: "claude-opus" } }),
      );

      saveEnv("SPECSTAR_CONFIG_FILE");
      process.env["SPECSTAR_CONFIG_FILE"] = configPath;

      try {
        const config = loadConfig(tmp);
        expect(config.sessions.model).toBe("claude-opus");
        // Other defaults still present
        expect(config.sessions.thinkingLevel).toBe("high");
        expect(config.sessions.maxConcurrent).toBe(8);
        expect(config.sessions.worktreeBase).toBe("../worktrees");
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test("merges project-level and explicit config with correct priority", () => {
      const tmp = makeTmpDir();

      // Project-level config (lower priority)
      writeFileSync(
        join(tmp, ".specstar.json"),
        JSON.stringify({
          sessions: { model: "project-model", maxConcurrent: 4 },
        }),
      );

      // Explicit config (higher priority)
      const explicitPath = join(tmp, "explicit.json");
      writeFileSync(
        explicitPath,
        JSON.stringify({ sessions: { model: "explicit-model" } }),
      );

      saveEnv("SPECSTAR_CONFIG_FILE");
      process.env["SPECSTAR_CONFIG_FILE"] = explicitPath;

      try {
        const config = loadConfig(tmp);
        // Explicit wins for model
        expect(config.sessions.model).toBe("explicit-model");
        // Project value survives for maxConcurrent (shallow merge at sessions level)
        expect(config.sessions.maxConcurrent).toBe(4);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test("applies SPECSTAR_LINEAR_API_KEY env override", () => {
      const tmp = makeTmpDir();
      saveEnv("SPECSTAR_CONFIG_FILE", "SPECSTAR_LINEAR_API_KEY");
      clearEnv("SPECSTAR_CONFIG_FILE");
      process.env["SPECSTAR_LINEAR_API_KEY"] = "test-linear-key";

      try {
        const config = loadConfig(tmp);
        expect(config.linear?.apiKey).toBe("test-linear-key");
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test("applies SPECSTAR_NOTION_API_KEY env override", () => {
      const tmp = makeTmpDir();
      saveEnv("SPECSTAR_CONFIG_FILE", "SPECSTAR_NOTION_API_KEY");
      clearEnv("SPECSTAR_CONFIG_FILE");
      process.env["SPECSTAR_NOTION_API_KEY"] = "test-notion-key";

      try {
        const config = loadConfig(tmp);
        expect(config.notion?.apiKey).toBe("test-notion-key");
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test("skips invalid JSON file and returns defaults", () => {
      const tmp = makeTmpDir();
      const badPath = join(tmp, "bad.json");
      writeFileSync(badPath, "not json");

      saveEnv("SPECSTAR_CONFIG_FILE");
      process.env["SPECSTAR_CONFIG_FILE"] = badPath;

      try {
        const config = loadConfig(tmp);
        expect(config.sessions).toEqual(DEFAULT_SESSIONS_CONFIG);
        expect(config.keybindings).toEqual(DEFAULT_KEYBINDINGS);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test("skips non-object JSON (array) and returns defaults", () => {
      const tmp = makeTmpDir();
      const arrayPath = join(tmp, "array.json");
      writeFileSync(arrayPath, "[1,2,3]");

      saveEnv("SPECSTAR_CONFIG_FILE");
      process.env["SPECSTAR_CONFIG_FILE"] = arrayPath;

      try {
        const config = loadConfig(tmp);
        expect(config.sessions).toEqual(DEFAULT_SESSIONS_CONFIG);
        expect(config.keybindings).toEqual(DEFAULT_KEYBINDINGS);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });
});
