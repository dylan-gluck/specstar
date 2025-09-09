#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

describe('CLI Contract: hook-integrator', () => {
  let tmpDir: string;
  
  beforeAll(async () => {
    // Create temp directory for test hooks
    tmpDir = join(tmpdir(), `specstar-test-hook-integrator-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Direct execution: specstar-hook-integrator', () => {
    it('should display help with --help flag', async () => {
      const result = await $`specstar-hook-integrator --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Claude Code hook management');
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('Commands:');
      expect(result.stdout.toString()).toContain('install');
      expect(result.stdout.toString()).toContain('uninstall');
      expect(result.stdout.toString()).toContain('list');
      expect(result.stdout.toString()).toContain('validate');
      expect(result.stdout.toString()).toContain('run');
    });
    
    it('should display help with -h flag', async () => {
      const result = await $`specstar-hook-integrator -h`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Claude Code hook management');
    });
    
    it('should display version with --version flag', async () => {
      const result = await $`specstar-hook-integrator --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should display version with -v flag', async () => {
      const result = await $`specstar-hook-integrator -v`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    describe('install command', () => {
      it('should install hooks in project', async () => {
        const result = await $`cd ${tmpDir} && specstar-hook-integrator install`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Hooks installed successfully');
        expect(result.stdout.toString()).toContain('.specstar/hooks.ts');
      });
      
      it('should update existing hooks', async () => {
        // Create existing hooks file
        await Bun.write(join(tmpDir, '.specstar', 'hooks.ts'), `
          // Existing hooks
          export const onSessionStart = () => {
            console.log("Old hook");
          };
        `);
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator install --update`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Hooks updated successfully');
      });
      
      it('should not overwrite without --force flag', async () => {
        await Bun.write(join(tmpDir, '.specstar', 'hooks.ts'), '// Custom hooks');
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator install`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Hooks already exist');
        expect(result.stderr.toString()).toContain('Use --force to overwrite');
      });
      
      it('should force overwrite with --force flag', async () => {
        await Bun.write(join(tmpDir, '.specstar', 'hooks.ts'), '// Will be overwritten');
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator install --force`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Hooks installed successfully');
      });
    });
    
    describe('uninstall command', () => {
      it('should remove hooks from project', async () => {
        // Install hooks first
        await Bun.write(join(tmpDir, '.specstar', 'hooks.ts'), '// Test hooks');
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator uninstall`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Hooks uninstalled successfully');
      });
      
      it('should handle no hooks to uninstall', async () => {
        const emptyDir = join(tmpDir, 'empty-project');
        await mkdir(emptyDir, { recursive: true });
        
        const result = await $`cd ${emptyDir} && specstar-hook-integrator uninstall`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('No hooks found to uninstall');
      });
    });
    
    describe('list command', () => {
      it('should list all available hooks', async () => {
        const hooksFile = join(tmpDir, '.specstar', 'hooks.ts');
        await Bun.write(hooksFile, `
          export const onSessionStart = () => {
            console.log("Session started");
          };
          
          export const onSessionEnd = () => {
            console.log("Session ended");
          };
          
          export const onFileChange = (file: string) => {
            console.log(\`File changed: \${file}\`);
          };
        `);
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator list`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Available hooks:');
        expect(result.stdout.toString()).toContain('onSessionStart');
        expect(result.stdout.toString()).toContain('onSessionEnd');
        expect(result.stdout.toString()).toContain('onFileChange');
        expect(result.stdout.toString()).toContain('3 hooks found');
      });
      
      it('should handle no hooks', async () => {
        const noHooksDir = join(tmpDir, 'no-hooks');
        await mkdir(noHooksDir, { recursive: true });
        
        const result = await $`cd ${noHooksDir} && specstar-hook-integrator list`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('No hooks found');
      });
    });
    
    describe('validate command', () => {
      it('should validate valid hooks file', async () => {
        const validHooks = join(tmpDir, '.specstar', 'valid-hooks.ts');
        await Bun.write(validHooks, `
          export const onSessionStart = () => {
            console.log("Valid hook");
          };
          
          export const onSessionEnd = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          };
        `);
        
        const result = await $`specstar-hook-integrator validate ${validHooks}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Hooks are valid');
        expect(result.stdout.toString()).toContain('2 hooks validated');
      });
      
      it('should detect invalid hooks', async () => {
        const invalidHooks = join(tmpDir, '.specstar', 'invalid-hooks.ts');
        await Bun.write(invalidHooks, `
          export const onSessionStart = "not a function";
          
          export const invalidHookName = () => {
            console.log("Invalid");
          };
        `);
        
        const result = await $`specstar-hook-integrator validate ${invalidHooks}`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Validation failed');
        expect(result.stderr.toString()).toContain('onSessionStart is not a function');
      });
      
      it('should detect syntax errors', async () => {
        const syntaxErrorHooks = join(tmpDir, '.specstar', 'syntax-error.ts');
        await Bun.write(syntaxErrorHooks, `
          export const onSessionStart = () => {
            console.log("Missing closing brace"
          // Missing closing brace
        `);
        
        const result = await $`specstar-hook-integrator validate ${syntaxErrorHooks}`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Syntax error');
      });
    });
    
    describe('run command', () => {
      it('should run a specific hook', async () => {
        const runnableHooks = join(tmpDir, '.specstar', 'runnable-hooks.ts');
        await Bun.write(runnableHooks, `
          export const onSessionStart = () => {
            console.log("Hook executed: onSessionStart");
            return { status: "success" };
          };
          
          export const onFileChange = (file: string) => {
            console.log(\`File changed: \${file}\`);
          };
        `);
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator run onSessionStart --hooks ${runnableHooks}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Hook executed: onSessionStart');
        expect(result.stdout.toString()).toContain('Hook completed successfully');
      });
      
      it('should pass arguments to hook', async () => {
        const argsHooks = join(tmpDir, '.specstar', 'args-hooks.ts');
        await Bun.write(argsHooks, `
          export const onFileChange = (file: string, action: string) => {
            console.log(\`File: \${file}, Action: \${action}\`);
          };
        `);
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator run onFileChange --hooks ${argsHooks} --args "test.ts" "modified"`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('File: test.ts, Action: modified');
      });
      
      it('should handle hook errors gracefully', async () => {
        const errorHooks = join(tmpDir, '.specstar', 'error-hooks.ts');
        await Bun.write(errorHooks, `
          export const onSessionStart = () => {
            throw new Error("Hook failed");
          };
        `);
        
        const result = await $`cd ${tmpDir} && specstar-hook-integrator run onSessionStart --hooks ${errorHooks}`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Hook execution failed');
        expect(result.stderr.toString()).toContain('Hook failed');
      });
    });
  });
  
  describe('Via main CLI: specstar lib hook-integrator', () => {
    it('should display help', async () => {
      const result = await $`specstar lib hook-integrator --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Claude Code hook management');
    });
    
    it('should display version', async () => {
      const result = await $`specstar lib hook-integrator --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should execute list command', async () => {
      const result = await $`cd ${tmpDir} && specstar lib hook-integrator list`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      // Should work regardless of hooks presence
    });
  });
});