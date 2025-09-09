/**
 * Test file for ListItemRenderContract
 * 
 * Tests the render() method output specifications:
 * - textColor: theme.fgAccent when selected, theme.fg otherwise
 * - backgroundColor: always 'transparent' or undefined (never green)
 * - prefix: '● ' for active items, '  ' for inactive items
 * - prefixColor: 'green' for active items
 * - emoji: always null (no emojis allowed)
 */

import { describe, test, expect } from 'bun:test';
import { ListItemRenderContract, SettingsContract } from '../../specs/003-current-status-the/contracts/hook-contracts.ts';

// ============================================================================
// TEST THEMES
// ============================================================================

const defaultTheme: SettingsContract['theme'] = {
  bg: '#000000',
  fg: '#ffffff',
  fgAccent: '#00ff00'
};

const customTheme: SettingsContract['theme'] = {
  bg: '#1a1a1a',
  fg: '#cccccc',
  fgAccent: '#ff6600'
};

const highContrastTheme: SettingsContract['theme'] = {
  bg: '#000000',
  fg: '#ffffff',
  fgAccent: '#ffff00'
};

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

/**
 * Compliant implementation that follows the contract
 */
class CompliantListItemRenderer implements ListItemRenderContract {
  constructor(
    public item: { id: string; label: string; isActive?: boolean },
    public isSelected: boolean,
    public theme: SettingsContract['theme']
  ) {}

  render() {
    return {
      textColor: this.isSelected ? this.theme.fgAccent : this.theme.fg,
      backgroundColor: 'transparent' as const,
      prefix: this.item.isActive ? '● ' : '  ',
      prefixColor: this.item.isActive ? 'green' : '',
      emoji: null as null
    };
  }
}

/**
 * Non-compliant implementation that violates the contract (for negative testing)
 */
class NonCompliantListItemRenderer implements ListItemRenderContract {
  constructor(
    public item: { id: string; label: string; isActive?: boolean },
    public isSelected: boolean,
    public theme: SettingsContract['theme'],
    private violationType: 'background' | 'emoji' | 'prefix' | 'textColor' | 'prefixColor'
  ) {}

  render() {
    const base = {
      textColor: this.isSelected ? this.theme.fgAccent : this.theme.fg,
      backgroundColor: 'transparent' as const,
      prefix: this.item.isActive ? '● ' : '  ',
      prefixColor: this.item.isActive ? 'green' : '',
      emoji: null as null
    };

    // Introduce specific violations
    switch (this.violationType) {
      case 'background':
        return { ...base, backgroundColor: 'green' };
      case 'emoji':
        return { ...base, emoji: '🔵' as any };
      case 'prefix':
        return { ...base, prefix: this.item.isActive ? '→ ' : '- ' };
      case 'textColor':
        return { ...base, textColor: 'red' };
      case 'prefixColor':
        return { ...base, prefixColor: this.item.isActive ? 'blue' : '' };
      default:
        return base;
    }
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Helper to validate a render output against the contract
 */
function validateRenderOutput(
  output: ReturnType<ListItemRenderContract['render']>,
  expectedTextColor: string,
  expectedPrefix: string,
  expectedPrefixColor: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check textColor
  if (output.textColor !== expectedTextColor) {
    errors.push(`textColor should be '${expectedTextColor}', got '${output.textColor}'`);
  }

  // Check backgroundColor
  if (output.backgroundColor !== 'transparent' && output.backgroundColor !== undefined) {
    errors.push(`backgroundColor must be 'transparent' or undefined, got '${output.backgroundColor}'`);
  }

  // Check prefix
  if (output.prefix !== expectedPrefix) {
    errors.push(`prefix should be '${expectedPrefix}', got '${output.prefix}'`);
  }

  // Check prefixColor
  if (output.prefixColor !== expectedPrefixColor) {
    errors.push(`prefixColor should be '${expectedPrefixColor}', got '${output.prefixColor}'`);
  }

  // Check emoji
  if (output.emoji !== null) {
    errors.push(`emoji must be null, got '${output.emoji}'`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

describe('ListItemRenderContract', () => {
  
  // ============================================================================
  // COMPLIANT IMPLEMENTATION TESTS
  // ============================================================================
  
  describe('Compliant Implementation', () => {
    
    test('Selected active item', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new CompliantListItemRenderer(item, true, defaultTheme);
      const output = renderer.render();
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent, // Selected should use fgAccent
        '● ',                  // Active should have bullet
        'green'                // Active should have green prefix
      );
      
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.log('Validation errors:', validation.errors);
      }
      
      expect(output.textColor).toBe(defaultTheme.fgAccent);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('● ');
      expect(output.prefixColor).toBe('green');
      expect(output.emoji).toBe(null);
    });

    test('Selected inactive item', () => {
      const item = { id: '2', label: 'Inactive Item', isActive: false };
      const renderer = new CompliantListItemRenderer(item, true, defaultTheme);
      const output = renderer.render();
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent, // Selected should use fgAccent
        '  ',                  // Inactive should have spaces
        ''                     // Inactive should have empty prefix color
      );
      
      expect(validation.valid).toBe(true);
      expect(output.textColor).toBe(defaultTheme.fgAccent);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('  ');
      expect(output.prefixColor).toBe('');
      expect(output.emoji).toBe(null);
    });

    test('Unselected active item', () => {
      const item = { id: '3', label: 'Active Item', isActive: true };
      const renderer = new CompliantListItemRenderer(item, false, defaultTheme);
      const output = renderer.render();
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fg,       // Unselected should use fg
        '● ',                  // Active should have bullet
        'green'                // Active should have green prefix
      );
      
      expect(validation.valid).toBe(true);
      expect(output.textColor).toBe(defaultTheme.fg);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('● ');
      expect(output.prefixColor).toBe('green');
      expect(output.emoji).toBe(null);
    });

    test('Unselected inactive item', () => {
      const item = { id: '4', label: 'Normal Item', isActive: false };
      const renderer = new CompliantListItemRenderer(item, false, defaultTheme);
      const output = renderer.render();
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fg,       // Unselected should use fg
        '  ',                  // Inactive should have spaces
        ''                     // Inactive should have empty prefix color
      );
      
      expect(validation.valid).toBe(true);
      expect(output.textColor).toBe(defaultTheme.fg);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('  ');
      expect(output.prefixColor).toBe('');
      expect(output.emoji).toBe(null);
    });
  });

  // ============================================================================
  // THEME VARIATIONS
  // ============================================================================
  
  describe('Different Theme Configurations', () => {
    
    test('Custom theme colors', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new CompliantListItemRenderer(item, true, customTheme);
      const output = renderer.render();
      
      expect(output.textColor).toBe(customTheme.fgAccent);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('● ');
      expect(output.prefixColor).toBe('green');
      expect(output.emoji).toBe(null);
    });

    test('High contrast theme', () => {
      const item = { id: '1', label: 'Test Item', isActive: false };
      const renderer = new CompliantListItemRenderer(item, true, highContrastTheme);
      const output = renderer.render();
      
      expect(output.textColor).toBe(highContrastTheme.fgAccent);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('  ');
      expect(output.prefixColor).toBe('');
      expect(output.emoji).toBe(null);
    });

    test('Unselected with custom theme', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new CompliantListItemRenderer(item, false, customTheme);
      const output = renderer.render();
      
      expect(output.textColor).toBe(customTheme.fg);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('● ');
      expect(output.prefixColor).toBe('green');
      expect(output.emoji).toBe(null);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  
  describe('Edge Cases', () => {
    
    test('Missing isActive property defaults to falsy', () => {
      const item = { id: '1', label: 'Test Item' }; // No isActive property
      const renderer = new CompliantListItemRenderer(item, false, defaultTheme);
      const output = renderer.render();
      
      expect(output.textColor).toBe(defaultTheme.fg);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('  '); // Should treat as inactive
      expect(output.prefixColor).toBe(''); // Should be empty for inactive
      expect(output.emoji).toBe(null);
    });

    test('Empty label string', () => {
      const item = { id: '1', label: '', isActive: true };
      const renderer = new CompliantListItemRenderer(item, true, defaultTheme);
      const output = renderer.render();
      
      // Should still render correctly even with empty label
      expect(output.textColor).toBe(defaultTheme.fgAccent);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('● ');
      expect(output.prefixColor).toBe('green');
      expect(output.emoji).toBe(null);
    });

    test('Very long label string', () => {
      const longLabel = 'A'.repeat(1000);
      const item = { id: '1', label: longLabel, isActive: false };
      const renderer = new CompliantListItemRenderer(item, false, defaultTheme);
      const output = renderer.render();
      
      // Should render correctly regardless of label length
      expect(output.textColor).toBe(defaultTheme.fg);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('  ');
      expect(output.prefixColor).toBe('');
      expect(output.emoji).toBe(null);
    });

    test('Special characters in label', () => {
      const item = { id: '1', label: '🚀 Special chars: @#$%^&*()[]{}', isActive: true };
      const renderer = new CompliantListItemRenderer(item, true, defaultTheme);
      const output = renderer.render();
      
      expect(output.textColor).toBe(defaultTheme.fgAccent);
      expect(output.backgroundColor).toBe('transparent');
      expect(output.prefix).toBe('● ');
      expect(output.prefixColor).toBe('green');
      expect(output.emoji).toBe(null); // Output emoji must be null even if label has emojis
    });
  });

  // ============================================================================
  // NON-COMPLIANT IMPLEMENTATION TESTS
  // ============================================================================
  
  describe('Non-Compliant Implementations', () => {
    
    test('Rejects green background (Bug 4 fix)', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new NonCompliantListItemRenderer(item, true, defaultTheme, 'background');
      const output = renderer.render();
      
      // Should fail validation due to green background
      expect(output.backgroundColor).toBe('green');
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent,
        '● ',
        'green'
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(`backgroundColor must be 'transparent' or undefined, got 'green'`);
    });

    test('Rejects emoji usage (Bug 4 fix)', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new NonCompliantListItemRenderer(item, true, defaultTheme, 'emoji');
      const output = renderer.render();
      
      // Should fail validation due to emoji
      expect(output.emoji).toBe('🔵');
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent,
        '● ',
        'green'
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(`emoji must be null, got '🔵'`);
    });

    test('Rejects incorrect prefix format', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new NonCompliantListItemRenderer(item, true, defaultTheme, 'prefix');
      const output = renderer.render();
      
      // Should fail validation due to wrong prefix
      expect(output.prefix).toBe('→ ');
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent,
        '● ',
        'green'
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(`prefix should be '● ', got '→ '`);
    });

    test('Rejects incorrect text color', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new NonCompliantListItemRenderer(item, true, defaultTheme, 'textColor');
      const output = renderer.render();
      
      // Should fail validation due to wrong text color
      expect(output.textColor).toBe('red');
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent,
        '● ',
        'green'
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(`textColor should be '${defaultTheme.fgAccent}', got 'red'`);
    });

    test('Rejects incorrect prefix color', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      const renderer = new NonCompliantListItemRenderer(item, true, defaultTheme, 'prefixColor');
      const output = renderer.render();
      
      // Should fail validation due to wrong prefix color
      expect(output.prefixColor).toBe('blue');
      
      const validation = validateRenderOutput(
        output,
        defaultTheme.fgAccent,
        '● ',
        'green'
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(`prefixColor should be 'green', got 'blue'`);
    });
  });

  // ============================================================================
  // COMPREHENSIVE MATRIX TESTS
  // ============================================================================
  
  describe('Comprehensive State Matrix', () => {
    
    const testCases = [
      {
        name: 'selected=true, active=true',
        isSelected: true,
        isActive: true,
        expectedTextColor: defaultTheme.fgAccent,
        expectedPrefix: '● ',
        expectedPrefixColor: 'green'
      },
      {
        name: 'selected=true, active=false',
        isSelected: true,
        isActive: false,
        expectedTextColor: defaultTheme.fgAccent,
        expectedPrefix: '  ',
        expectedPrefixColor: ''
      },
      {
        name: 'selected=false, active=true',
        isSelected: false,
        isActive: true,
        expectedTextColor: defaultTheme.fg,
        expectedPrefix: '● ',
        expectedPrefixColor: 'green'
      },
      {
        name: 'selected=false, active=false',
        isSelected: false,
        isActive: false,
        expectedTextColor: defaultTheme.fg,
        expectedPrefix: '  ',
        expectedPrefixColor: ''
      },
      {
        name: 'selected=true, active=undefined',
        isSelected: true,
        isActive: undefined,
        expectedTextColor: defaultTheme.fgAccent,
        expectedPrefix: '  ',
        expectedPrefixColor: ''
      },
      {
        name: 'selected=false, active=undefined',
        isSelected: false,
        isActive: undefined,
        expectedTextColor: defaultTheme.fg,
        expectedPrefix: '  ',
        expectedPrefixColor: ''
      }
    ];

    testCases.forEach(({ name, isSelected, isActive, expectedTextColor, expectedPrefix, expectedPrefixColor }) => {
      test(name, () => {
        const item = { id: '1', label: 'Test Item', isActive };
        const renderer = new CompliantListItemRenderer(item, isSelected, defaultTheme);
        const output = renderer.render();
        
        const validation = validateRenderOutput(
          output,
          expectedTextColor,
          expectedPrefix,
          expectedPrefixColor
        );
        
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.log(`${name} validation errors:`, validation.errors);
        }
        
        expect(output.textColor).toBe(expectedTextColor);
        expect(output.backgroundColor).toBe('transparent');
        expect(output.prefix).toBe(expectedPrefix);
        expect(output.prefixColor).toBe(expectedPrefixColor);
        expect(output.emoji).toBe(null);
      });
    });
  });

  // ============================================================================
  // REGRESSION TESTS FOR BUG 4
  // ============================================================================
  
  describe('Bug 4 Regression Tests', () => {
    
    test('Never uses green background for selection (critical fix)', () => {
      const testCases = [
        { isSelected: true, isActive: true },
        { isSelected: true, isActive: false },
        { isSelected: false, isActive: true },
        { isSelected: false, isActive: false }
      ];
      
      testCases.forEach(({ isSelected, isActive }) => {
        const item = { id: '1', label: 'Test Item', isActive };
        const renderer = new CompliantListItemRenderer(item, isSelected, defaultTheme);
        const output = renderer.render();
        
        expect(output.backgroundColor).not.toBe('green');
        expect(output.backgroundColor).toBe('transparent');
      });
    });

    test('Uses green text (fgAccent) for selection instead of background', () => {
      const item = { id: '1', label: 'Test Item', isActive: true };
      
      // Selected item should have accent color text
      const selectedRenderer = new CompliantListItemRenderer(item, true, defaultTheme);
      const selectedOutput = selectedRenderer.render();
      expect(selectedOutput.textColor).toBe(defaultTheme.fgAccent);
      expect(selectedOutput.backgroundColor).toBe('transparent');
      
      // Unselected item should have normal color text  
      const unselectedRenderer = new CompliantListItemRenderer(item, false, defaultTheme);
      const unselectedOutput = unselectedRenderer.render();
      expect(unselectedOutput.textColor).toBe(defaultTheme.fg);
      expect(unselectedOutput.backgroundColor).toBe('transparent');
    });

    test('Never includes emojis in output (critical fix)', () => {
      const testCases = [
        { isSelected: true, isActive: true },
        { isSelected: true, isActive: false },
        { isSelected: false, isActive: true },
        { isSelected: false, isActive: false }
      ];
      
      testCases.forEach(({ isSelected, isActive }) => {
        const item = { id: '1', label: 'Test Item 🚀', isActive }; // Emoji in label is OK
        const renderer = new CompliantListItemRenderer(item, isSelected, defaultTheme);
        const output = renderer.render();
        
        expect(output.emoji).toBe(null); // Output emoji must always be null
        expect(output.emoji).not.toBe('🚀');
        expect(output.emoji).not.toBe('●');
        expect(output.emoji).not.toBe('✓');
      });
    });

    test('Active indicator uses prefix, not emoji', () => {
      // Active items
      const activeItem = { id: '1', label: 'Active Item', isActive: true };
      const activeRenderer = new CompliantListItemRenderer(activeItem, false, defaultTheme);
      const activeOutput = activeRenderer.render();
      
      expect(activeOutput.prefix).toBe('● ');
      expect(activeOutput.prefixColor).toBe('green');
      expect(activeOutput.emoji).toBe(null);
      
      // Inactive items
      const inactiveItem = { id: '2', label: 'Inactive Item', isActive: false };
      const inactiveRenderer = new CompliantListItemRenderer(inactiveItem, false, defaultTheme);
      const inactiveOutput = inactiveRenderer.render();
      
      expect(inactiveOutput.prefix).toBe('  ');
      expect(inactiveOutput.prefixColor).toBe('');
      expect(inactiveOutput.emoji).toBe(null);
    });
  });
});