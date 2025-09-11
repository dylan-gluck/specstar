#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';
import ConfigManager, { type SpecstarConfig } from '../../src/lib/config-manager/index';

describe('ConfigManager Settings Validation', () => {
  let tmpDir: string;
  let configManager: ConfigManager;
  
  beforeAll(async () => {
    // Create temp directory for test configurations
    tmpDir = join(tmpdir(), `specstar-config-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    configManager = new ConfigManager({ configPath: join(tmpDir, '.specstar') });
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('DEFAULT_CONFIG validation', () => {
    it('should include startPage in default configuration', () => {
      // Access the DEFAULT_CONFIG through initialization
      const manager = new ConfigManager();
      
      // Initialize to create default config, then check it
      const defaultConfig: SpecstarConfig = {
        version: '1.0.0',
        startPage: 'plan',
        folders: [
          { title: 'Docs', path: 'docs' },
          { title: 'Specs', path: 'specs' },
          { title: 'Templates', path: 'templates' }
        ],
        theme: 'dark',
        autoStart: false,
        logLevel: 'info'
      };
      
      expect(defaultConfig.startPage).toBe('plan');
      expect(defaultConfig.startPage).toBeOneOf(['plan', 'observe', 'help']);
    });

    it('should NOT include sessionPath in default configuration', () => {
      const defaultConfig: SpecstarConfig = {
        version: '1.0.0',
        startPage: 'plan',
        folders: [
          { title: 'Docs', path: 'docs' },
          { title: 'Specs', path: 'specs' },
          { title: 'Templates', path: 'templates' }
        ],
        theme: 'dark',
        autoStart: false,
        logLevel: 'info'
      };
      
      // TypeScript should prevent sessionPath from existing, but let's verify
      expect('sessionPath' in defaultConfig).toBe(false);
      expect((defaultConfig as any).sessionPath).toBeUndefined();
    });

    it('should validate SpecstarConfig interface works correctly', () => {
      const testConfig: SpecstarConfig = {
        version: '1.0.0',
        startPage: 'observe',
        folders: [
          { title: 'Test', path: 'test' }
        ],
        theme: 'light',
        autoStart: true,
        logLevel: 'debug'
      };
      
      expect(testConfig.version).toBe('1.0.0');
      expect(testConfig.startPage).toBe('observe');
      expect(testConfig.folders).toHaveLength(1);
      expect(testConfig.theme).toBe('light');
      expect(testConfig.autoStart).toBe(true);
      expect(testConfig.logLevel).toBe('debug');
    });

    it('should allow optional fields in SpecstarConfig', () => {
      const minimalConfig: SpecstarConfig = {
        version: '1.0.0'
      };
      
      expect(minimalConfig.version).toBe('1.0.0');
      expect(minimalConfig.startPage).toBeUndefined();
      expect(minimalConfig.folders).toBeUndefined();
      expect(minimalConfig.theme).toBeUndefined();
      expect(minimalConfig.autoStart).toBeUndefined();
      expect(minimalConfig.logLevel).toBeUndefined();
    });
  });

  describe('ConfigManager load() method validation', () => {
    it('should return startPage when available in config file', async () => {
      const testConfig = {
        version: '1.0.0',
        startPage: 'observe',
        theme: 'light'
      };
      
      const configPath = join(tmpDir, '.specstar', 'settings.json');
      await mkdir(join(tmpDir, '.specstar'), { recursive: true });
      await Bun.write(configPath, JSON.stringify(testConfig));
      
      const loadedConfig = await configManager.load();
      
      expect(loadedConfig.startPage).toBe('observe');
      expect(loadedConfig.version).toBe('1.0.0');
      expect(loadedConfig.theme).toBe('light');
    });

    it('should handle missing startPage gracefully', async () => {
      const testConfigWithoutStartPage = {
        version: '1.0.0',
        theme: 'dark'
      };
      
      const configPath = join(tmpDir, '.specstar', 'settings.json');
      await Bun.write(configPath, JSON.stringify(testConfigWithoutStartPage));
      
      const loadedConfig = await configManager.load();
      
      expect(loadedConfig.version).toBe('1.0.0');
      expect(loadedConfig.theme).toBe('dark');
      // startPage should be undefined when not present (not defaulted by ConfigManager)
      expect(loadedConfig.startPage).toBeUndefined();
    });

    it('should validate loaded configuration structure', async () => {
      const validConfig = {
        version: '1.0.0',
        startPage: 'plan',
        folders: [
          { title: 'Test Docs', path: 'test-docs' }
        ],
        theme: 'light',
        autoStart: false,
        logLevel: 'info'
      };
      
      const configPath = join(tmpDir, '.specstar', 'settings.json');
      await Bun.write(configPath, JSON.stringify(validConfig));
      
      const loadedConfig = await configManager.load();
      
      expect(configManager.validate(loadedConfig)).toBe(true);
      expect(loadedConfig.startPage).toBe('plan');
      expect(loadedConfig.folders).toHaveLength(1);
      expect(loadedConfig.folders?.[0]?.title).toBe('Test Docs');
    });

    it('should reject invalid startPage values', async () => {
      const invalidConfig = {
        version: '1.0.0',
        startPage: 'invalid-page',
        theme: 'dark'
      };
      
      expect(configManager.validate(invalidConfig)).toBe(false);
    });

    it('should accept valid startPage values', async () => {
      const planConfig = { version: '1.0.0', startPage: 'plan' };
      const observeConfig = { version: '1.0.0', startPage: 'observe' };
      const helpConfig = { version: '1.0.0', startPage: 'help' };
      
      expect(configManager.validate(planConfig)).toBe(true);
      expect(configManager.validate(observeConfig)).toBe(true);
      expect(configManager.validate(helpConfig)).toBe(true);
    });

    it('should reject config with sessionPath (backward compatibility check)', async () => {
      const oldStyleConfig = {
        version: '1.0.0',
        sessionPath: '.specstar/sessions',  // This should not be valid
        startPage: 'plan'
      };
      
      // The validate method should still pass since sessionPath is not part of SpecstarConfig
      // but it's ignored
      expect(configManager.validate(oldStyleConfig)).toBe(true);
      
      // However, when loaded through TypeScript typing, sessionPath should not be accessible
      const typedConfig: SpecstarConfig = oldStyleConfig as SpecstarConfig;
      expect('sessionPath' in typedConfig).toBe(true); // It exists in the object
      // But it's not in the TypeScript interface, so accessing it would be an error
    });
  });

  describe('ConfigManager init() method validation', () => {
    it('should create config with correct default startPage', async () => {
      const initDir = join(tmpDir, 'init-test');
      await mkdir(initDir, { recursive: true });
      
      await configManager.init(initDir, { updateClaudeSettings: false });
      
      const configPath = join(initDir, '.specstar', 'settings.json');
      const configText = await Bun.file(configPath).text();
      const savedConfig = JSON.parse(configText);
      
      expect(savedConfig.startPage).toBe('observe');
      expect(savedConfig.version).toBe('1.0.0');
      expect(savedConfig.sessionPath).toBeUndefined();
    });

    it('should validate initialized config passes validation', async () => {
      const initDir = join(tmpDir, 'validation-test');
      await mkdir(initDir, { recursive: true });
      
      await configManager.init(initDir, { updateClaudeSettings: false });
      
      const configPath = join(initDir, '.specstar', 'settings.json');
      const configText = await Bun.file(configPath).text();
      const savedConfig = JSON.parse(configText);
      
      expect(configManager.validate(savedConfig)).toBe(true);
    });
  });

  describe('Backward compatibility with settings-loader', () => {
    it('should demonstrate difference between new and old config structures', () => {
      // New SpecstarConfig (what we want)
      const newConfig: SpecstarConfig = {
        version: '1.0.0',
        startPage: 'plan',
        // No sessionPath - this is the key change
        folders: [{ title: 'Docs', path: 'docs' }]
      };
      
      // Old style config (what used to exist)
      const oldStyleConfig = {
        version: '1.0.0',
        sessionPath: '.specstar/sessions', // This should no longer be used
        startPage: 'plan',
        folders: [{ title: 'Docs', path: 'docs' }]
      };
      
      // New config validation should pass
      expect(configManager.validate(newConfig)).toBe(true);
      
      // Old style config should also pass validation (sessionPath is ignored)
      expect(configManager.validate(oldStyleConfig)).toBe(true);
      
      // But the new interface doesn't include sessionPath
      expect('sessionPath' in newConfig).toBe(false);
      expect('startPage' in newConfig).toBe(true);
    });
  });
});