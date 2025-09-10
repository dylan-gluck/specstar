/**
 * Settings Model Tests
 * 
 * Tests the Settings interface and related functions for Bug 2 - Start Page Configuration.
 * These tests will initially FAIL because the startPage property doesn't exist yet.
 */

import { describe, test, expect } from 'bun:test';
import {
  type Settings,
  type ThemeSettings,
  type HookSettings,
  LogLevel,
  isValidSettings,
  createSettings,
  serializeSettings,
  deserializeSettings,
  migrateSettings,
  validateSettings
} from '../../src/models/settings';

describe('Settings Model - Start Page Configuration', () => {
  describe('Settings interface', () => {
    test('should have startPage property of correct type', () => {
      // This test will fail initially because startPage doesn't exist
      const settings = createSettings();
      
      // TypeScript should enforce the type at compile time
      expect(settings).toHaveProperty('startPage');
      expect(typeof settings.startPage).toBe('string');
      
      // Should be one of the allowed values
      const validValues = ['plan', 'observe', 'help'];
      expect(validValues).toContain(settings.startPage);
    });
  });

  describe('Default settings', () => {
    test('should have reasonable startPage default value', () => {
      const settings = createSettings();
      
      // Should default to 'plan' as it's the main functionality
      expect(settings.startPage).toBe('plan');
    });

    test('should maintain startPage in DEFAULT_SETTINGS', () => {
      // Import DEFAULT_SETTINGS to verify it has startPage
      const { DEFAULT_SETTINGS } = require('../../src/models/settings');
      
      expect(DEFAULT_SETTINGS).toHaveProperty('startPage');
      expect(DEFAULT_SETTINGS.startPage).toBe('plan');
    });
  });

  describe('Validation', () => {
    describe('valid startPage values', () => {
      test('should accept valid startPage values', () => {
        const validValues: Array<'plan' | 'observe' | 'help'> = ['plan', 'observe', 'help'];
        
        for (const startPage of validValues) {
          const settings = createSettings({ startPage });
          
          expect(isValidSettings(settings)).toBe(true);
          expect(validateSettings(settings)).toBe(true);
        }
      });
    });

    describe('invalid startPage values', () => {
      test('should reject invalid startPage values', () => {
        const invalidValues = ['dashboard', 'settings', '', 'invalid', null, undefined, 123, true, false];
        
        for (const startPage of invalidValues) {
          const invalidSettings = {
            ...createSettings(),
            startPage: startPage as any
          };
          
          expect(isValidSettings(invalidSettings)).toBe(false);
          expect(validateSettings(invalidSettings)).toBe(false);
        }
      });

      test('should reject settings without startPage', () => {
        const settingsWithoutStartPage = { ...createSettings() };
        delete (settingsWithoutStartPage as any).startPage;
        
        expect(isValidSettings(settingsWithoutStartPage)).toBe(false);
        expect(validateSettings(settingsWithoutStartPage)).toBe(false);
      });
    });
  });

  describe('Serialization and Deserialization', () => {
    test('should preserve startPage during serialization round-trip', () => {
      const originalSettings = createSettings({ startPage: 'observe' });
      
      const serialized = serializeSettings(originalSettings);
      const deserialized = deserializeSettings(serialized);
      
      expect(deserialized.startPage).toBe('observe');
      expect(deserialized.startPage).toBe(originalSettings.startPage);
    });

    test('should preserve all startPage values during serialization', () => {
      const validValues: Array<'plan' | 'observe' | 'help'> = ['plan', 'observe', 'help'];
      
      for (const startPage of validValues) {
        const originalSettings = createSettings({ startPage });
        
        const serialized = serializeSettings(originalSettings);
        const deserialized = deserializeSettings(serialized);
        
        expect(deserialized.startPage).toBe(startPage);
      }
    });

    test('should fail deserialization with invalid startPage', () => {
      const validSettings = createSettings({ startPage: 'plan' });
      const serialized = serializeSettings(validSettings);
      
      // Manually corrupt the serialized data
      const corrupted = serialized.replace('"startPage": "plan"', '"startPage": "invalid"');
      
      expect(() => deserializeSettings(corrupted)).toThrow('Invalid settings data');
    });

    test('should fail deserialization without startPage', () => {
      const validSettings = createSettings({ startPage: 'plan' });
      const serialized = serializeSettings(validSettings);
      
      // Remove startPage from serialized data
      const withoutStartPage = serialized.replace(/"startPage": "plan",?\s*/, '');
      
      expect(() => deserializeSettings(withoutStartPage)).toThrow('Invalid settings data');
    });
  });

  describe('Settings creation with partial settings', () => {
    test('should handle startPage parameter in createSettings', () => {
      const customStartPage = 'help';
      const settings = createSettings({ startPage: customStartPage });
      
      expect(settings.startPage).toBe(customStartPage);
    });

    test('should use default startPage when not provided', () => {
      const settings = createSettings({});
      
      expect(settings.startPage).toBe('plan'); // Should default to 'plan'
    });

    test('should override default startPage when provided', () => {
      const settings = createSettings({ startPage: 'observe' });
      
      expect(settings.startPage).toBe('observe');
    });

    test('should preserve other settings when setting startPage', () => {
      const customLogLevel = LogLevel.Debug;
      const customAutoStart = true;
      
      const settings = createSettings({
        startPage: 'help',
        logLevel: customLogLevel,
        autoStart: customAutoStart
      });
      
      expect(settings.startPage).toBe('help');
      expect(settings.logLevel).toBe(customLogLevel);
      expect(settings.autoStart).toBe(customAutoStart);
    });
  });

  describe('Migration from old settings', () => {
    test('should handle missing startPage by setting default', () => {
      const oldSettings = {
        version: '0.9.0',
        sessionPath: '.specstar/sessions',
        autoStart: true,
        logLevel: 'info',
        hooks: {
          enabled: false,
          path: '.specstar/hooks.ts',
          onSessionStart: true,
          onSessionEnd: true,
          onFileChange: false,
          onCommand: false,
          onError: true
        },
        theme: {
          primaryColor: '#00ff00',
          accentColor: '#0099ff',
          backgroundColor: '#000000',
          textColor: '#ffffff',
          borderStyle: 'single',
          syntax: 'auto'
        }
        // No startPage property
      };
      
      const migratedSettings = migrateSettings(oldSettings);
      
      expect(migratedSettings.startPage).toBe('plan'); // Should default to 'plan'
      expect(isValidSettings(migratedSettings)).toBe(true);
    });

    test('should preserve existing startPage during migration', () => {
      const oldSettings = {
        version: '0.9.0',
        sessionPath: '.specstar/sessions',
        startPage: 'observe', // Has startPage
        autoStart: false,
        logLevel: 'warn',
        hooks: {
          enabled: true,
          path: '.specstar/hooks.ts',
          onSessionStart: true,
          onSessionEnd: true,
          onFileChange: false,
          onCommand: false,
          onError: true
        },
        theme: {
          primaryColor: '#ff0000',
          accentColor: '#00ff00',
          backgroundColor: '#222222',
          textColor: '#eeeeee',
          borderStyle: 'double',
          syntax: 'monokai'
        }
      };
      
      const migratedSettings = migrateSettings(oldSettings);
      
      expect(migratedSettings.startPage).toBe('observe'); // Should preserve existing
      expect(isValidSettings(migratedSettings)).toBe(true);
    });

    test('should fix invalid startPage during migration', () => {
      const oldSettings = {
        version: '0.8.0',
        sessionPath: '.specstar/sessions',
        startPage: 'dashboard', // Invalid value
        autoStart: true,
        logLevel: 'debug',
        hooks: {
          enabled: false,
          path: '.specstar/hooks.ts',
          onSessionStart: true,
          onSessionEnd: true,
          onFileChange: false,
          onCommand: false,
          onError: true
        },
        theme: {
          primaryColor: '#ffffff',
          accentColor: '#ff9900',
          backgroundColor: '#111111',
          textColor: '#cccccc',
          borderStyle: 'round',
          syntax: 'github'
        }
      };
      
      const migratedSettings = migrateSettings(oldSettings);
      
      expect(migratedSettings.startPage).toBe('plan'); // Should default when invalid
      expect(isValidSettings(migratedSettings)).toBe(true);
    });

    test('should handle completely empty old settings', () => {
      const oldSettings = {};
      
      const migratedSettings = migrateSettings(oldSettings);
      
      expect(migratedSettings.startPage).toBe('plan'); // Should have default
      expect(isValidSettings(migratedSettings)).toBe(true);
    });

    test('should handle old settings with only startPage', () => {
      const oldSettings = {
        startPage: 'help'
      };
      
      const migratedSettings = migrateSettings(oldSettings);
      
      expect(migratedSettings.startPage).toBe('help'); // Should preserve valid value
      expect(isValidSettings(migratedSettings)).toBe(true);
    });
  });

  describe('Settings update operations', () => {
    test('should create update function for startPage', () => {
      // This test expects a new updateStartPage function to be created
      const { updateStartPage } = require('../../src/models/settings');
      
      const originalSettings = createSettings({ startPage: 'plan' });
      const updatedSettings = updateStartPage(originalSettings, 'observe');
      
      expect(updatedSettings.startPage).toBe('observe');
      expect(originalSettings.startPage).toBe('plan'); // Should not mutate original
    });

    test('should validate startPage in update function', () => {
      const { updateStartPage } = require('../../src/models/settings');
      
      const originalSettings = createSettings({ startPage: 'plan' });
      
      // Should throw or handle invalid values appropriately
      expect(() => updateStartPage(originalSettings, 'invalid' as any)).toThrow();
    });
  });

  describe('Type safety', () => {
    test('should enforce startPage type at compile time', () => {
      // This test verifies TypeScript compilation
      const settings: Settings = createSettings({
        startPage: 'plan' // This should compile
      });
      
      expect(settings.startPage).toBe('plan');
      
      // The following should cause TypeScript errors (commented out):
      // const invalidSettings: Settings = createSettings({
      //   startPage: 'invalid' // TypeScript error
      // });
    });

    test('should allow startPage in Settings interface', () => {
      // Type check that Settings interface accepts startPage
      const validSettings: Settings = {
        version: '1.0.0',
        startPage: 'observe', // Should be allowed
        hooks: {
          enabled: false,
          path: '.specstar/hooks.ts',
          onSessionStart: true,
          onSessionEnd: true,
          onFileChange: false,
          onCommand: false,
          onError: true
        },
        theme: {
          bg: '#000000',
          fg: '#ffffff',
          fgAccent: '#0099ff'
        },
        autoStart: false,
        logLevel: LogLevel.Info
      };
      
      expect(validSettings.startPage).toBe('observe');
    });
  });

  describe('Integration with existing functionality', () => {
    test('should not break existing Settings properties', () => {
      const settings = createSettings({ startPage: 'help' });
      
      // Verify all existing properties still work
      expect(settings.version).toBeDefined();
      // sessionPath should NOT be defined (it's hardcoded, not configurable)
      expect(settings).not.toHaveProperty('sessionPath');
      expect(settings.hooks).toBeDefined();
      expect(settings.theme).toBeDefined();
      expect(settings.autoStart).toBeDefined();
      expect(settings.logLevel).toBeDefined();
      expect(settings.watchInterval).toBeDefined();
      expect(settings.maxSessionHistory).toBeDefined();
      expect(settings.enableNotifications).toBeDefined();
      expect(settings.keybindings).toBeDefined();
      expect(settings.plugins).toBeDefined();
    });

    test('should work with existing validation functions', () => {
      const settings = createSettings({ startPage: 'observe' });
      
      expect(isValidSettings(settings)).toBe(true);
      expect(validateSettings(settings)).toBe(true);
    });

    test('should work with existing serialization', () => {
      const settings = createSettings({ startPage: 'help' });
      
      expect(() => serializeSettings(settings)).not.toThrow();
      
      const serialized = serializeSettings(settings);
      expect(serialized).toContain('"startPage": "help"');
    });
  });
});