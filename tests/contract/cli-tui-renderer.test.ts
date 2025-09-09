#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

describe('CLI Contract: tui-renderer', () => {
  let tmpDir: string;
  
  beforeAll(async () => {
    // Create temp directory for test files
    tmpDir = join(tmpdir(), `specstar-test-tui-renderer-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Direct execution: specstar-tui-renderer', () => {
    it('should display help with --help flag', async () => {
      const result = await $`specstar-tui-renderer --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Terminal UI rendering utilities');
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('Commands:');
      expect(result.stdout.toString()).toContain('render');
      expect(result.stdout.toString()).toContain('preview');
      expect(result.stdout.toString()).toContain('export');
    });
    
    it('should display help with -h flag', async () => {
      const result = await $`specstar-tui-renderer -h`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Terminal UI rendering utilities');
    });
    
    it('should display version with --version flag', async () => {
      const result = await $`specstar-tui-renderer --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should display version with -v flag', async () => {
      const result = await $`specstar-tui-renderer -v`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    describe('render command', () => {
      it('should render a component file', async () => {
        const componentFile = join(tmpDir, 'test-component.tsx');
        await Bun.write(componentFile, `
          import React from 'react';
          import { Box, Text } from 'ink';
          
          export default function TestComponent() {
            return (
              <Box>
                <Text>Test Component</Text>
              </Box>
            );
          }
        `);
        
        const result = await $`specstar-tui-renderer render ${componentFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Rendering component');
      });
      
      it('should error on invalid component file', async () => {
        const result = await $`specstar-tui-renderer render /nonexistent/file.tsx`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Error');
      });
    });
    
    describe('preview command', () => {
      it('should preview a component in watch mode', async () => {
        const componentFile = join(tmpDir, 'preview-component.tsx');
        await Bun.write(componentFile, `
          export default function PreviewComponent() {
            return 'Preview';
          }
        `);
        
        // Start preview and kill after 1 second
        const preview = $`specstar-tui-renderer preview ${componentFile}`.quiet().nothrow();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        preview.kill();
        
        const result = await preview;
        
        // Preview should be killed gracefully
        expect(result.signal).toBeDefined();
      });
    });
    
    describe('export command', () => {
      it('should export component output to file', async () => {
        const componentFile = join(tmpDir, 'export-component.tsx');
        const outputFile = join(tmpDir, 'output.txt');
        
        await Bun.write(componentFile, `
          export default function ExportComponent() {
            return 'Exported Content';
          }
        `);
        
        const result = await $`specstar-tui-renderer export ${componentFile} --output ${outputFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Exported to');
      });
    });
  });
  
  describe('Via main CLI: specstar lib tui-renderer', () => {
    it('should display help', async () => {
      const result = await $`specstar lib tui-renderer --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Terminal UI rendering utilities');
    });
    
    it('should display version', async () => {
      const result = await $`specstar lib tui-renderer --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should execute render command', async () => {
      const componentFile = join(tmpDir, 'main-cli-component.tsx');
      await Bun.write(componentFile, `
        export default function MainCliComponent() {
          return 'Main CLI Test';
        }
      `);
      
      const result = await $`specstar lib tui-renderer render ${componentFile}`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Rendering component');
    });
  });
});