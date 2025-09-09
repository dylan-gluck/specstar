/**
 * Settings Contract Validation Tests
 * 
 * Tests the SettingsContract interface and testSettingsCompliance function
 * following TDD principles to verify contract specifications exactly.
 */

import { describe, test, expect } from 'bun:test';
import { 
  SettingsContract,
  testSettingsCompliance 
} from '../../specs/003-current-status-the/contracts/hook-contracts';

describe('SettingsContract validation', () => {
  describe('testSettingsCompliance function', () => {
    describe('valid settings objects', () => {
      test('should pass validation for complete valid settings', () => {
        const validSettings: SettingsContract = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          },
          features: {
            autoRefresh: true,
            darkMode: true,
            sessionMonitoring: true
          }
        };

        const result = testSettingsCompliance(validSettings);
        
        expect(result.passed).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should pass validation with different valid startPage values', () => {
        const startPageValues: Array<'plan' | 'observe' | 'help'> = ['plan', 'observe', 'help'];
        
        for (const startPage of startPageValues) {
          const settings = {
            startPage,
            theme: {
              bg: '#000000',
              fg: '#ffffff',
              fgAccent: '#00ff00'
            },
            folders: {
              config: '.specstar',
              logs: '.specstar/logs',
              cache: '.specstar/cache'
            },
            features: {
              autoRefresh: true,
              darkMode: true,
              sessionMonitoring: true
            }
          };

          const result = testSettingsCompliance(settings);
          
          expect(result.passed).toBe(true);
          expect(result.errors).toEqual([]);
        }
      });

      test('should pass validation with minimal theme properties', () => {
        const settings = {
          startPage: 'observe',
          theme: {
            bg: 'black',
            fg: 'white',
            fgAccent: 'green'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          },
          features: {
            autoRefresh: false,
            darkMode: false,
            sessionMonitoring: false
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('startPage validation', () => {
      test('should fail validation when startPage is missing', () => {
        const settings = {
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('startPage must be one of: plan, observe, help');
      });

      test('should fail validation when startPage is invalid', () => {
        const invalidValues = ['dashboard', 'settings', '', null, undefined, 123, true];
        
        for (const startPage of invalidValues) {
          const settings = {
            startPage,
            theme: {
              bg: '#000000',
              fg: '#ffffff',
              fgAccent: '#00ff00'
            },
            folders: {
              config: '.specstar',
              logs: '.specstar/logs',
              cache: '.specstar/cache'
            }
          };

          const result = testSettingsCompliance(settings);
          
          expect(result.passed).toBe(false);
          expect(result.errors).toContain('startPage must be one of: plan, observe, help');
        }
      });
    });

    describe('theme validation', () => {
      test('should fail validation when theme is missing', () => {
        const settings = {
          startPage: 'plan',
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('theme must be an object');
      });

      test('should fail validation when theme is not an object', () => {
        const invalidThemes = [
          { value: 'string', expectsObjectError: true },
          { value: 123, expectsObjectError: true },
          { value: true, expectsObjectError: true },
          { value: null, expectsObjectError: true },
          { value: [], expectsObjectError: false } // Arrays pass typeof object check but fail property checks
        ];
        
        for (const { value: theme, expectsObjectError } of invalidThemes) {
          const settings = {
            startPage: 'plan',
            theme,
            folders: {
              config: '.specstar',
              logs: '.specstar/logs',
              cache: '.specstar/cache'
            }
          };

          const result = testSettingsCompliance(settings);
          
          expect(result.passed).toBe(false);
          
          if (expectsObjectError) {
            expect(result.errors).toContain('theme must be an object');
          } else {
            // Arrays pass typeof object check but fail individual property checks
            expect(result.errors).toContain('theme.bg is required');
            expect(result.errors).toContain('theme.fg is required');
            expect(result.errors).toContain('theme.fgAccent is required');
          }
        }
      });

      test('should fail validation when theme.bg is missing', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            fg: '#ffffff',
            fgAccent: '#00ff00'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('theme.bg is required');
      });

      test('should fail validation when theme.fg is missing', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fgAccent: '#00ff00'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('theme.fg is required');
      });

      test('should fail validation when theme.fgAccent is missing', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fg: '#ffffff'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('theme.fgAccent is required');
      });

      test('should fail validation when multiple theme properties are missing', () => {
        const settings = {
          startPage: 'plan',
          theme: {},
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('theme.bg is required');
        expect(result.errors).toContain('theme.fg is required');
        expect(result.errors).toContain('theme.fgAccent is required');
      });

      test('should fail validation when theme properties are falsy', () => {
        const falsyValues = ['', null, undefined, 0, false];
        
        for (const falsyValue of falsyValues) {
          const settings = {
            startPage: 'plan',
            theme: {
              bg: falsyValue,
              fg: falsyValue,
              fgAccent: falsyValue
            },
            folders: {
              config: '.specstar',
              logs: '.specstar/logs',
              cache: '.specstar/cache'
            }
          };

          const result = testSettingsCompliance(settings);
          
          expect(result.passed).toBe(false);
          expect(result.errors).toContain('theme.bg is required');
          expect(result.errors).toContain('theme.fg is required');
          expect(result.errors).toContain('theme.fgAccent is required');
        }
      });
    });

    describe('forbidden fields validation', () => {
      test('should fail validation when sessionPath is present in folders', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache',
            sessionPath: '.specstar/sessions' // This should not be configurable
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('sessionPath must not be configurable');
      });

      test('should fail validation when sessionPath is present even if other validations fail', () => {
        const settings = {
          startPage: 'invalid',
          theme: {},
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache',
            sessionPath: '.specstar/sessions'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('sessionPath must not be configurable');
        expect(result.errors).toContain('startPage must be one of: plan, observe, help');
        expect(result.errors).toContain('theme.bg is required');
        expect(result.errors).toContain('theme.fg is required');
        expect(result.errors).toContain('theme.fgAccent is required');
      });

      test('should pass validation when folders is missing sessionPath', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          },
          folders: {
            config: '.specstar',
            logs: '.specstar/logs',
            cache: '.specstar/cache'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should pass validation when folders is undefined', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('edge cases', () => {
      test('should handle null settings object', () => {
        // The current implementation will throw when trying to access properties on null
        expect(() => testSettingsCompliance(null)).toThrow();
      });

      test('should handle undefined settings object', () => {
        // The current implementation will throw when trying to access properties on undefined
        expect(() => testSettingsCompliance(undefined)).toThrow();
      });

      test('should handle empty settings object', () => {
        const result = testSettingsCompliance({});
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('startPage must be one of: plan, observe, help');
        expect(result.errors).toContain('theme must be an object');
      });

      test('should handle array instead of object', () => {
        const result = testSettingsCompliance([]);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toContain('startPage must be one of: plan, observe, help');
        expect(result.errors).toContain('theme must be an object');
      });

      test('should handle primitive values', () => {
        const primitives = ['string', 123, true, false];
        
        for (const primitive of primitives) {
          const result = testSettingsCompliance(primitive);
          
          expect(result.passed).toBe(false);
          expect(result.errors).toContain('startPage must be one of: plan, observe, help');
          expect(result.errors).toContain('theme must be an object');
        }
      });
    });

    describe('multiple validation errors', () => {
      test('should accumulate all validation errors', () => {
        const settings = {
          startPage: 'invalid',
          theme: null,
          folders: {
            sessionPath: '.specstar/sessions'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors).toContain('startPage must be one of: plan, observe, help');
        expect(result.errors).toContain('theme must be an object');
        expect(result.errors).toContain('sessionPath must not be configurable');
      });

      test('should return errors in consistent order', () => {
        const settings = {
          startPage: 'bad',
          theme: {},
          folders: {
            sessionPath: '.specstar/sessions'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.passed).toBe(false);
        expect(result.errors[0]).toBe('startPage must be one of: plan, observe, help');
        expect(result.errors).toContain('theme.bg is required');
        expect(result.errors).toContain('theme.fg is required');
        expect(result.errors).toContain('theme.fgAccent is required');
        expect(result.errors).toContain('sessionPath must not be configurable');
      });
    });

    describe('error message accuracy', () => {
      test('should have exact error message for invalid startPage', () => {
        const settings = {
          startPage: 'dashboard',
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.errors).toContain('startPage must be one of: plan, observe, help');
      });

      test('should have exact error message for invalid theme', () => {
        const settings = {
          startPage: 'plan',
          theme: 'invalid'
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.errors).toContain('theme must be an object');
      });

      test('should have exact error messages for missing theme properties', () => {
        const settings = {
          startPage: 'plan',
          theme: {}
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.errors).toContain('theme.bg is required');
        expect(result.errors).toContain('theme.fg is required');
        expect(result.errors).toContain('theme.fgAccent is required');
      });

      test('should have exact error message for forbidden sessionPath', () => {
        const settings = {
          startPage: 'plan',
          theme: {
            bg: '#000000',
            fg: '#ffffff',
            fgAccent: '#00ff00'
          },
          folders: {
            sessionPath: '.specstar/sessions'
          }
        };

        const result = testSettingsCompliance(settings);
        
        expect(result.errors).toContain('sessionPath must not be configurable');
      });
    });
  });

  describe('SettingsContract interface', () => {
    test('should enforce TypeScript type checking for valid settings', () => {
      // This test verifies TypeScript compilation - if it compiles, the interface is correct
      const validSettings: SettingsContract = {
        startPage: 'plan',
        theme: {
          bg: '#000000',
          fg: '#ffffff',
          fgAccent: '#00ff00'
        },
        folders: {
          config: '.specstar',
          logs: '.specstar/logs',
          cache: '.specstar/cache'
          // sessionPath is intentionally omitted as per contract
        },
        features: {
          autoRefresh: true,
          darkMode: true,
          sessionMonitoring: true
        }
      };

      expect(validSettings.startPage).toBe('plan');
      expect(validSettings.theme.bg).toBe('#000000');
      expect(validSettings.theme.fg).toBe('#ffffff');
      expect(validSettings.theme.fgAccent).toBe('#00ff00');
      expect(validSettings.folders.config).toBe('.specstar');
      expect(validSettings.folders.logs).toBe('.specstar/logs');
      expect(validSettings.folders.cache).toBe('.specstar/cache');
      expect(validSettings.features.autoRefresh).toBe(true);
      expect(validSettings.features.darkMode).toBe(true);
      expect(validSettings.features.sessionMonitoring).toBe(true);
    });

    test('should support all valid startPage values', () => {
      const planSettings: SettingsContract = {
        startPage: 'plan',
        theme: { bg: 'black', fg: 'white', fgAccent: 'green' },
        folders: { config: '.specstar', logs: '.specstar/logs', cache: '.specstar/cache' },
        features: { autoRefresh: true, darkMode: true, sessionMonitoring: true }
      };

      const observeSettings: SettingsContract = {
        startPage: 'observe',
        theme: { bg: 'black', fg: 'white', fgAccent: 'green' },
        folders: { config: '.specstar', logs: '.specstar/logs', cache: '.specstar/cache' },
        features: { autoRefresh: true, darkMode: true, sessionMonitoring: true }
      };

      const helpSettings: SettingsContract = {
        startPage: 'help',
        theme: { bg: 'black', fg: 'white', fgAccent: 'green' },
        folders: { config: '.specstar', logs: '.specstar/logs', cache: '.specstar/cache' },
        features: { autoRefresh: true, darkMode: true, sessionMonitoring: true }
      };

      expect(planSettings.startPage).toBe('plan');
      expect(observeSettings.startPage).toBe('observe');
      expect(helpSettings.startPage).toBe('help');
    });
  });
});