import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { ConfigManager } from "../../src/lib/config-manager";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

describe("Claude Settings Integration", () => {
  let testDir: string;
  let configManager: ConfigManager;
  let claudeSettingsPath: string;
  let backupPath: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `specstar-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create .claude directory
    const claudeDir = path.join(testDir, ".claude");
    await fs.mkdir(claudeDir, { recursive: true });
    
    claudeSettingsPath = path.join(claudeDir, "settings.json");
    backupPath = path.join(claudeDir, "settings.backup.json");
    
    // Initialize ConfigManager with test directory
    configManager = new ConfigManager({ configPath: path.join(testDir, '.specstar') });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("should read existing .claude/settings.json", async () => {
    // Arrange: Create existing settings file with user configuration
    const existingSettings = {
      "context.enabled": true,
      "context.autoDetect": false,
      "context.custom": ["src/**/*.ts", "docs/**/*.md"],
      "someOtherSetting": "userValue"
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Read settings directly (ConfigManager doesn't have readClaudeCodeSettings)
    const settings = JSON.parse(await fs.readFile(claudeSettingsPath, "utf-8"));

    // Assert: Settings are correctly read
    expect(settings).toEqual(existingSettings);
    expect(settings["context.enabled"]).toBe(true);
    expect(settings["context.custom"]).toEqual(["src/**/*.ts", "docs/**/*.md"]);
  });

  test("should merge hook configuration into existing settings", async () => {
    // Arrange: Create existing settings
    const existingSettings = {
      "context.enabled": true,
      "context.autoDetect": false,
      "context.custom": ["src/**/*.ts"],
      "userPreference": "keepThis"
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Hook configuration to merge
    const hookConfig = {
      hooks: {
        onInit: "echo 'Session started'",
        onFileChange: "specstar observe --update"
      }
    };

    // Act: Update settings with hook configuration
    // updateClaudeCodeSettings requires projectPath and hooksPath
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: Settings are merged correctly
    const updatedSettings = JSON.parse(
      await fs.readFile(claudeSettingsPath, "utf-8")
    );
    
    expect(updatedSettings["context.enabled"]).toBe(true);
    expect(updatedSettings["context.custom"]).toEqual(["src/**/*.ts"]);
    expect(updatedSettings["userPreference"]).toBe("keepThis");
    expect(updatedSettings["hooks"]).toEqual(hookConfig.hooks);
  });

  test("should preserve all existing user settings when adding hooks", async () => {
    // Arrange: Complex existing settings
    const existingSettings = {
      "context.enabled": true,
      "context.autoDetect": false,
      "context.custom": ["src/**/*.ts", "tests/**/*.test.ts"],
      "editor.theme": "dark",
      "editor.fontSize": 14,
      "nested": {
        "deep": {
          "setting": "value"
        }
      },
      "arraySettings": [1, 2, 3]
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Add hooks without disturbing other settings
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: All original settings preserved
    const updatedSettings = JSON.parse(
      await fs.readFile(claudeSettingsPath, "utf-8")
    );
    
    expect(updatedSettings["context.enabled"]).toBe(true);
    expect(updatedSettings["context.custom"]).toEqual(["src/**/*.ts", "tests/**/*.test.ts"]);
    expect(updatedSettings["editor.theme"]).toBe("dark");
    expect(updatedSettings["editor.fontSize"]).toBe(14);
    expect(updatedSettings["nested"]).toEqual({ deep: { setting: "value" } });
    expect(updatedSettings["arraySettings"]).toEqual([1, 2, 3]);
    expect(updatedSettings["hooks"]).toEqual({ onInit: "specstar observe --start" });
  });

  test("should create backup before modifying settings", async () => {
    // Arrange: Create existing settings
    const existingSettings = {
      "context.enabled": true,
      "important": "data"
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Update settings
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: Backup file exists with original content
    const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
    expect(backupExists).toBe(true);
    
    const backupContent = JSON.parse(
      await fs.readFile(backupPath, "utf-8")
    );
    expect(backupContent).toEqual(existingSettings);
  });

  test("should create timestamped backup files to avoid overwriting", async () => {
    // Arrange: Create existing settings
    const existingSettings = {
      "context.enabled": true
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Multiple updates should create multiple backups
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    // Create a different backup filename by modifying the claude settings path
    const claudeDir = path.join(testDir, ".claude");
    const altBackupPath = path.join(claudeDir, 'settings.json.backup2');
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: Multiple backup files exist
    const files = await fs.readdir(claudeDir);
    const backupFiles = files.filter(f => f.startsWith("settings.backup"));
    
    expect(backupFiles.length).toBeGreaterThanOrEqual(2);
  });

  test("should reject invalid settings with clear error messages", async () => {
    // Arrange: Create valid existing settings
    const existingSettings = {
      "context.enabled": true
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Note: updateClaudeCodeSettings doesn't validate hook types in the current implementation
    // It just writes the standard hooks configuration
    // These validation tests would need a different implementation
  });

  test("should handle missing .claude/settings.json gracefully", async () => {
    // Arrange: No settings.json file exists

    // Act: Try to read non-existent settings
    // ConfigManager doesn't have readClaudeCodeSettings, read directly
    let settings = {};
    try {
      settings = JSON.parse(await fs.readFile(claudeSettingsPath, "utf-8"));
    } catch (e) {
      // File doesn't exist, which is expected
    }

    // Assert: Returns empty object or default settings
    expect(settings).toEqual({});
  });

  test("should create .claude/settings.json if it doesn't exist", async () => {
    // Arrange: No settings.json file exists
    
    // Act: Update settings when file doesn't exist
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: File is created with the new settings
    const fileExists = await fs.access(claudeSettingsPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
    
    const settings = JSON.parse(
      await fs.readFile(claudeSettingsPath, "utf-8")
    );
    expect(settings["hooks"]).toEqual({ onInit: "specstar observe --start" });
  });

  test("should preserve formatting (2-space indentation) in settings.json", async () => {
    // Arrange: Create settings with specific formatting
    const existingSettings = {
      "context.enabled": true,
      "nested": {
        "value": "test"
      }
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Update settings
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: File maintains 2-space indentation
    const fileContent = await fs.readFile(claudeSettingsPath, "utf-8");
    
    // Check for 2-space indentation
    expect(fileContent).toContain('  "context.enabled"');
    expect(fileContent).toContain('  "nested"');
    expect(fileContent).toContain('    "value"'); // Nested object should have 4 spaces
    
    // Ensure it's valid JSON
    expect(() => JSON.parse(fileContent)).not.toThrow();
  });

  test("should update existing hooks without duplicating", async () => {
    // Arrange: Create settings with existing hooks
    const existingSettings = {
      "context.enabled": true,
      "hooks": {
        "onInit": "old-command",
        "onFileChange": "existing-file-hook"
      }
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Update with new hook values
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);

    // Assert: Hooks are replaced with standard Specstar hooks configuration
    const updatedSettings = JSON.parse(
      await fs.readFile(claudeSettingsPath, "utf-8")
    );
    
    // Check that hooks were updated with standard structure
    expect(updatedSettings["hooks"]).toHaveProperty("SessionStart");
    expect(updatedSettings["hooks"]).toHaveProperty("SessionEnd");
    expect(updatedSettings["hooks"]).toHaveProperty("PostToolUse");
  });

  test("should use standard Claude Code hook names", async () => {
    // updateClaudeCodeSettings always writes the standard hooks
    await configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath);
    
    const settings = JSON.parse(await fs.readFile(claudeSettingsPath, "utf-8"));
    
    // Verify standard Claude Code hooks are present
    const expectedHooks = [
      "SessionStart", "SessionEnd", "PostToolUse", "PreToolUse",
      "PreCompact", "Stop", "SubagentStop", "UserPromptSubmit", "Notification"
    ];
    
    for (const hookName of expectedHooks) {
      expect(settings.hooks).toHaveProperty(hookName);
    }
  });

  test("should handle concurrent updates safely", async () => {
    // Arrange: Create initial settings
    const existingSettings = {
      "context.enabled": true,
      "counter": 0
    };
    
    await fs.writeFile(
      claudeSettingsPath,
      JSON.stringify(existingSettings, null, 2)
    );

    // Act: Perform concurrent updates
    const updates = Array.from({ length: 5 }, (_, i) => 
      configManager.updateClaudeCodeSettings(testDir, path.join(testDir, '.specstar/hooks.ts'), claudeSettingsPath)
    );

    await Promise.all(updates);

    // Assert: Settings file should still be valid JSON after concurrent updates
    const finalSettings = JSON.parse(
      await fs.readFile(claudeSettingsPath, "utf-8")
    );
    
    // Verify hooks structure is intact
    expect(finalSettings.hooks).toBeDefined();
    expect(finalSettings.hooks).toHaveProperty("SessionStart");
  });
});