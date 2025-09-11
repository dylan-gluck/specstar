import { describe, test, expect } from 'bun:test';
import {
  type Settings,
  LogLevel,
  isValidSettings,
  createSettings,
  serializeSettings,
  deserializeSettings,
  migrateSettings,
  validateSettings
} from '../../src/models/settings';

describe('Settings', () => {
  describe('Settings Model', () => {
    test('should have startPage property', () => {
      const settings = createSettings();
      
      expect(settings).toHaveProperty('startPage');
      expect(typeof settings.startPage).toBe('string');
      
      const validValues = ['plan', 'observe', 'help'];
      expect(validValues).toContain(settings.startPage);
    });

    test('should have correct default values', () => {
      const settings = createSettings();
      
      expect(settings.startPage).toBe('plan');
      expect(settings.version).toBeDefined();
      expect(settings.autoStart).toBe(false);
      expect(settings.logLevel).toBe(LogLevel.Info);
    });

    test('should accept partial settings', () => {
      const settings = createSettings({ 
        startPage: 'observe',
        autoStart: true,
        logLevel: LogLevel.Debug
      });
      
      expect(settings.startPage).toBe('observe');
      expect(settings.autoStart).toBe(true);
      expect(settings.logLevel).toBe(LogLevel.Debug);
    });
  });

  describe('Validation', () => {
    test('should accept valid startPage values', () => {
      const validValues: Array<'plan' | 'observe' | 'help'> = ['plan', 'observe', 'help'];
      
      for (const startPage of validValues) {
        const settings = createSettings({ startPage });
        
        expect(isValidSettings(settings)).toBe(true);
        expect(validateSettings(settings)).toBe(true);
      }
    });

    test('should reject invalid startPage values', () => {
      const invalidValues = ['dashboard', 'settings', '', 'invalid'];
      
      for (const startPage of invalidValues) {
        const invalidSettings = {
          ...createSettings(),
          startPage: startPage as any
        };
        
        expect(isValidSettings(invalidSettings)).toBe(false);
        expect(validateSettings(invalidSettings)).toBe(false);
      }
    });

    test('should reject settings without required properties', () => {
      const incompleteSettings = { startPage: 'plan' };
      
      expect(isValidSettings(incompleteSettings)).toBe(false);
      expect(validateSettings(incompleteSettings)).toBe(false);
    });

    test('should validate all required properties', () => {
      const settings = createSettings();
      
      expect(settings.version).toBeDefined();
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
  });

  describe('Serialization', () => {
    test('should serialize and deserialize correctly', () => {
      const original = createSettings({ startPage: 'observe' });
      
      const serialized = serializeSettings(original);
      const deserialized = deserializeSettings(serialized);
      
      expect(deserialized.startPage).toBe('observe');
      expect(deserialized).toEqual(original);
    });

    test('should preserve all values during round-trip', () => {
      const original = createSettings({
        startPage: 'help',
        autoStart: true,
        logLevel: LogLevel.Debug,
        watchInterval: 2000,
        maxSessionHistory: 50,
        enableNotifications: true
      });
      
      const serialized = serializeSettings(original);
      const deserialized = deserializeSettings(serialized);
      
      expect(deserialized).toEqual(original);
    });

    test('should fail on invalid JSON', () => {
      expect(() => deserializeSettings('invalid json')).toThrow();
    });

    test('should fail on invalid settings data', () => {
      const invalidData = JSON.stringify({ startPage: 'invalid' });
      expect(() => deserializeSettings(invalidData)).toThrow('Invalid settings data');
    });
  });

  describe('Migration', () => {
    test('should add missing startPage with default value', () => {
      const oldSettings = {
        version: '0.9.0',
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
      };
      
      const migrated = migrateSettings(oldSettings);
      
      expect(migrated.startPage).toBe('plan');
      expect(isValidSettings(migrated)).toBe(true);
    });

    test('should preserve existing valid startPage', () => {
      const oldSettings = {
        version: '0.9.0',
        startPage: 'observe',
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
      
      const migrated = migrateSettings(oldSettings);
      
      expect(migrated.startPage).toBe('observe');
      expect(isValidSettings(migrated)).toBe(true);
    });

    test('should fix invalid startPage value', () => {
      const oldSettings = {
        version: '0.8.0',
        startPage: 'dashboard', // Invalid
        autoStart: true,
        logLevel: 'debug'
      };
      
      const migrated = migrateSettings(oldSettings);
      
      expect(migrated.startPage).toBe('plan');
      expect(isValidSettings(migrated)).toBe(true);
    });

    test('should handle empty settings object', () => {
      const migrated = migrateSettings({});
      
      expect(migrated.startPage).toBe('plan');
      expect(isValidSettings(migrated)).toBe(true);
    });
  });

  describe('Type Safety', () => {
    test('should enforce correct types', () => {
      const settings: Settings = createSettings({
        startPage: 'plan'
      });
      
      expect(settings.startPage).toBe('plan');
    });

    test('should have all required properties in interface', () => {
      const validSettings: Settings = {
        version: '1.0.0',
        startPage: 'observe',
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
        logLevel: LogLevel.Info,
        watchInterval: 1000,
        maxSessionHistory: 100,
        enableNotifications: false,
        keybindings: {
          quit: 'q',
          help: 'h',
          switchView: 'tab',
          scrollUp: 'up',
          scrollDown: 'down',
          pageUp: 'pageup',
          pageDown: 'pagedown',
          refresh: 'r'
        },
        plugins: []
      };
      
      expect(validSettings.startPage).toBe('observe');
    });
  });
});