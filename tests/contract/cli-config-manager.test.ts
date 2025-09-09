#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

describe('CLI Contract: config-manager', () => {
  let tmpDir: string;
  
  beforeAll(async () => {
    // Create temp directory for test configurations
    tmpDir = join(tmpdir(), `specstar-test-config-manager-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Direct execution: specstar-config-manager', () => {
    it('should display help with --help flag', async () => {
      const result = await $`specstar-config-manager --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Configuration management');
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('Commands:');
      expect(result.stdout.toString()).toContain('init');
      expect(result.stdout.toString()).toContain('get');
      expect(result.stdout.toString()).toContain('set');
      expect(result.stdout.toString()).toContain('list');
      expect(result.stdout.toString()).toContain('reset');
      expect(result.stdout.toString()).toContain('validate');
    });
    
    it('should display help with -h flag', async () => {
      const result = await $`specstar-config-manager -h`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Configuration management');
    });
    
    it('should display version with --version flag', async () => {
      const result = await $`specstar-config-manager --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should display version with -v flag', async () => {
      const result = await $`specstar-config-manager -v`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    describe('init command', () => {
      it('should initialize configuration', async () => {
        const initDir = join(tmpDir, 'init-test');
        await mkdir(initDir, { recursive: true });
        
        const result = await $`cd ${initDir} && specstar-config-manager init`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration initialized successfully');
        expect(result.stdout.toString()).toContain('.specstar/settings.json');
      });
      
      it('should not overwrite existing config without --force', async () => {
        const existingDir = join(tmpDir, 'existing-config');
        await mkdir(join(existingDir, '.specstar'), { recursive: true });
        await Bun.write(join(existingDir, '.specstar', 'settings.json'), JSON.stringify({
          version: '1.0.0',
          customSetting: 'value'
        }));
        
        const result = await $`cd ${existingDir} && specstar-config-manager init`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Configuration already exists');
        expect(result.stderr.toString()).toContain('Use --force to overwrite');
      });
      
      it('should force overwrite with --force flag', async () => {
        const forceDir = join(tmpDir, 'force-config');
        await mkdir(join(forceDir, '.specstar'), { recursive: true });
        await Bun.write(join(forceDir, '.specstar', 'settings.json'), '{"old": "config"}');
        
        const result = await $`cd ${forceDir} && specstar-config-manager init --force`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration initialized successfully');
      });
      
      it('should initialize with custom values', async () => {
        const customDir = join(tmpDir, 'custom-init');
        await mkdir(customDir, { recursive: true });
        
        const result = await $`cd ${customDir} && specstar-config-manager init --theme dark --auto-save true`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration initialized with custom settings');
      });
    });
    
    describe('get command', () => {
      it('should get a configuration value', async () => {
        const configFile = join(tmpDir, '.specstar', 'settings.json');
        await Bun.write(configFile, JSON.stringify({
          theme: 'light',
          autoSave: true,
          editor: {
            fontSize: 14,
            tabSize: 2
          }
        }, null, 2));
        
        const result = await $`cd ${tmpDir} && specstar-config-manager get theme`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('theme: light');
      });
      
      it('should get nested configuration value', async () => {
        const result = await $`cd ${tmpDir} && specstar-config-manager get editor.fontSize`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('editor.fontSize: 14');
      });
      
      it('should handle non-existent key', async () => {
        const result = await $`cd ${tmpDir} && specstar-config-manager get nonexistent`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Configuration key not found');
      });
      
      it('should get all config with no key specified', async () => {
        const result = await $`cd ${tmpDir} && specstar-config-manager get`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('theme');
        expect(result.stdout.toString()).toContain('autoSave');
        expect(result.stdout.toString()).toContain('editor');
      });
    });
    
    describe('set command', () => {
      it('should set a configuration value', async () => {
        const setDir = join(tmpDir, 'set-test');
        await mkdir(join(setDir, '.specstar'), { recursive: true });
        await Bun.write(join(setDir, '.specstar', 'settings.json'), JSON.stringify({
          theme: 'light'
        }));
        
        const result = await $`cd ${setDir} && specstar-config-manager set theme dark`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration updated');
        expect(result.stdout.toString()).toContain('theme: dark');
      });
      
      it('should set nested configuration value', async () => {
        const nestedDir = join(tmpDir, 'nested-set');
        await mkdir(join(nestedDir, '.specstar'), { recursive: true });
        await Bun.write(join(nestedDir, '.specstar', 'settings.json'), JSON.stringify({
          editor: {
            fontSize: 12
          }
        }));
        
        const result = await $`cd ${nestedDir} && specstar-config-manager set editor.fontSize 16`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('editor.fontSize: 16');
      });
      
      it('should create new keys', async () => {
        const newKeyDir = join(tmpDir, 'new-key');
        await mkdir(join(newKeyDir, '.specstar'), { recursive: true });
        await Bun.write(join(newKeyDir, '.specstar', 'settings.json'), '{}');
        
        const result = await $`cd ${newKeyDir} && specstar-config-manager set newFeature.enabled true`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration updated');
        expect(result.stdout.toString()).toContain('newFeature.enabled: true');
      });
      
      it('should validate value types', async () => {
        const typeDir = join(tmpDir, 'type-validation');
        await mkdir(join(typeDir, '.specstar'), { recursive: true });
        await Bun.write(join(typeDir, '.specstar', 'settings.json'), JSON.stringify({
          port: 3000
        }));
        
        const result = await $`cd ${typeDir} && specstar-config-manager set port "not-a-number"`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Invalid value type');
      });
    });
    
    describe('list command', () => {
      it('should list all configuration keys', async () => {
        const listDir = join(tmpDir, 'list-test');
        await mkdir(join(listDir, '.specstar'), { recursive: true });
        await Bun.write(join(listDir, '.specstar', 'settings.json'), JSON.stringify({
          theme: 'dark',
          autoSave: true,
          editor: {
            fontSize: 14,
            tabSize: 2,
            wordWrap: true
          },
          terminal: {
            shell: '/bin/bash',
            fontSize: 12
          }
        }, null, 2));
        
        const result = await $`cd ${listDir} && specstar-config-manager list`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration settings:');
        expect(result.stdout.toString()).toContain('theme: dark');
        expect(result.stdout.toString()).toContain('autoSave: true');
        expect(result.stdout.toString()).toContain('editor.fontSize: 14');
        expect(result.stdout.toString()).toContain('editor.tabSize: 2');
        expect(result.stdout.toString()).toContain('terminal.shell: /bin/bash');
      });
      
      it('should list with --json flag', async () => {
        const jsonDir = join(tmpDir, 'json-list');
        await mkdir(join(jsonDir, '.specstar'), { recursive: true });
        await Bun.write(join(jsonDir, '.specstar', 'settings.json'), JSON.stringify({
          key1: 'value1',
          key2: 123
        }));
        
        const result = await $`cd ${jsonDir} && specstar-config-manager list --json`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        const output = result.stdout.toString();
        expect(() => JSON.parse(output)).not.toThrow();
        const parsed = JSON.parse(output);
        expect(parsed.key1).toBe('value1');
        expect(parsed.key2).toBe(123);
      });
      
      it('should handle empty configuration', async () => {
        const emptyDir = join(tmpDir, 'empty-config');
        await mkdir(join(emptyDir, '.specstar'), { recursive: true });
        await Bun.write(join(emptyDir, '.specstar', 'settings.json'), '{}');
        
        const result = await $`cd ${emptyDir} && specstar-config-manager list`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('No configuration settings found');
      });
    });
    
    describe('reset command', () => {
      it('should reset configuration to defaults', async () => {
        const resetDir = join(tmpDir, 'reset-test');
        await mkdir(join(resetDir, '.specstar'), { recursive: true });
        await Bun.write(join(resetDir, '.specstar', 'settings.json'), JSON.stringify({
          theme: 'custom',
          customSetting: 'value'
        }));
        
        const result = await $`cd ${resetDir} && specstar-config-manager reset --confirm`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration reset to defaults');
      });
      
      it('should require confirmation', async () => {
        const confirmDir = join(tmpDir, 'confirm-reset');
        await mkdir(join(confirmDir, '.specstar'), { recursive: true });
        await Bun.write(join(confirmDir, '.specstar', 'settings.json'), '{"custom": "value"}');
        
        const result = await $`cd ${confirmDir} && specstar-config-manager reset`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Confirmation required');
        expect(result.stderr.toString()).toContain('Use --confirm');
      });
      
      it('should reset specific keys only', async () => {
        const partialDir = join(tmpDir, 'partial-reset');
        await mkdir(join(partialDir, '.specstar'), { recursive: true });
        await Bun.write(join(partialDir, '.specstar', 'settings.json'), JSON.stringify({
          theme: 'custom',
          autoSave: false,
          editor: {
            fontSize: 20
          }
        }));
        
        const result = await $`cd ${partialDir} && specstar-config-manager reset theme editor.fontSize --confirm`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Reset configuration keys:');
        expect(result.stdout.toString()).toContain('theme');
        expect(result.stdout.toString()).toContain('editor.fontSize');
      });
    });
    
    describe('validate command', () => {
      it('should validate valid configuration', async () => {
        const validDir = join(tmpDir, 'valid-config');
        await mkdir(join(validDir, '.specstar'), { recursive: true });
        await Bun.write(join(validDir, '.specstar', 'settings.json'), JSON.stringify({
          theme: 'light',
          autoSave: true,
          editor: {
            fontSize: 14,
            tabSize: 2
          }
        }, null, 2));
        
        const result = await $`cd ${validDir} && specstar-config-manager validate`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration is valid');
      });
      
      it('should detect invalid JSON', async () => {
        const invalidJsonDir = join(tmpDir, 'invalid-json');
        await mkdir(join(invalidJsonDir, '.specstar'), { recursive: true });
        await Bun.write(join(invalidJsonDir, '.specstar', 'settings.json'), '{ invalid json }');
        
        const result = await $`cd ${invalidJsonDir} && specstar-config-manager validate`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Invalid JSON');
      });
      
      it('should validate against schema', async () => {
        const schemaDir = join(tmpDir, 'schema-validation');
        await mkdir(join(schemaDir, '.specstar'), { recursive: true });
        await Bun.write(join(schemaDir, '.specstar', 'settings.json'), JSON.stringify({
          theme: 'invalid-theme-value',
          autoSave: 'not-a-boolean'
        }));
        
        const result = await $`cd ${schemaDir} && specstar-config-manager validate --strict`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Schema validation failed');
      });
      
      it('should validate with custom schema', async () => {
        const customSchemaDir = join(tmpDir, 'custom-schema');
        await mkdir(join(customSchemaDir, '.specstar'), { recursive: true });
        await Bun.write(join(customSchemaDir, '.specstar', 'settings.json'), JSON.stringify({
          customField: 'value'
        }));
        await Bun.write(join(customSchemaDir, '.specstar', 'schema.json'), JSON.stringify({
          type: 'object',
          properties: {
            customField: { type: 'string' }
          },
          required: ['customField']
        }));
        
        const result = await $`cd ${customSchemaDir} && specstar-config-manager validate --schema .specstar/schema.json`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Configuration is valid');
      });
    });
  });
  
  describe('Via main CLI: specstar lib config-manager', () => {
    it('should display help', async () => {
      const result = await $`specstar lib config-manager --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Configuration management');
    });
    
    it('should display version', async () => {
      const result = await $`specstar lib config-manager --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should execute list command', async () => {
      const mainCliDir = join(tmpDir, 'main-cli-test');
      await mkdir(join(mainCliDir, '.specstar'), { recursive: true });
      await Bun.write(join(mainCliDir, '.specstar', 'settings.json'), JSON.stringify({
        test: 'value'
      }));
      
      const result = await $`cd ${mainCliDir} && specstar lib config-manager list`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('test: value');
    });
  });
});