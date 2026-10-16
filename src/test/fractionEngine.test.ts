/**
 * Kesir Atölyesi - Matematik Motoru Testleri
 */
import { describe, it, expect } from 'vitest';
import {
  fraction,
  add,
  subtract,
  multiply,
  divide,
  compare,
  areEqual,
  simplify,
  fractionToString,
  generateEquivalentFractions,
  lcm,
  toDecimal,
  explainComparison,
  toMixedFraction,
  fromMixedFraction,
  expandFraction,
  getCommonDenominatorSteps,
  getGridDimensions,
} from '../engines/fractionEngine';

describe('Fraction Engine - fraction()', () => {
  it('should simplify 2/4 to 1/2', () => {
    const f = fraction(2, 4);
    expect(f.numerator).toBe(1);
    expect(f.denominator).toBe(2);
  });
  
  it('should simplify 6/9 to 2/3', () => {
    const f = fraction(6, 9);
    expect(f.numerator).toBe(2);
    expect(f.denominator).toBe(3);
  });
  
  it('should throw on zero denominator', () => {
    expect(() => fraction(1, 0)).toThrow('Payda sıfır olamaz');
  });
  
  it('should handle negative fractions', () => {
    const f = fraction(-3, 6);
    expect(f.numerator).toBe(-1);
    expect(f.denominator).toBe(2);
  });
});

describe('Fraction Engine - add()', () => {
  it('1/2 + 1/4 = 3/4', () => {
    const result = add(fraction(1, 2), fraction(1, 4));
    const expected = fraction(3, 4);
    expect(areEqual(result, expected)).toBe(true);
  });
  
  it('1/3 + 1/6 = 1/2', () => {
    const result = add(fraction(1, 3), fraction(1, 6));
    const expected = fraction(1, 2);
    expect(areEqual(result, expected)).toBe(true);
  });
  
  it('should handle same denominator', () => {
    const result = add(fraction(2, 5), fraction(1, 5));
    const expected = fraction(3, 5);
    expect(areEqual(result, expected)).toBe(true);
  });
});

describe('Fraction Engine - subtract()', () => {
  it('3/4 - 1/4 = 1/2', () => {
    const result = subtract(fraction(3, 4), fraction(1, 4));
    expect(areEqual(result, fraction(1, 2))).toBe(true);
  });
  
  it('1/2 - 1/3 = 1/6', () => {
    const result = subtract(fraction(1, 2), fraction(1, 3));
    expect(areEqual(result, fraction(1, 6))).toBe(true);
  });
});

describe('Fraction Engine - compare()', () => {
  it('1/2 < 3/4', () => {
    expect(compare(fraction(1, 2), fraction(3, 4))).toBe(-1);
  });
  
  it('3/5 > 1/2', () => {
    expect(compare(fraction(3, 5), fraction(1, 2))).toBe(1);
  });
  
  it('2/4 = 1/2', () => {
    expect(compare(fraction(2, 4), fraction(1, 2))).toBe(0);
  });
  
  it('1/3 < 1/2', () => {
    expect(compare(fraction(1, 3), fraction(1, 2))).toBe(-1);
  });
  
  // Float-free comparison: these would be equal with floating point error
  it('should compare without floating point errors', () => {
    // 1/3 vs 3/10 - exact comparison
    expect(compare(fraction(1, 3), fraction(3, 10))).toBe(1); // 10 > 9
  });
});

describe('Fraction Engine - areEqual()', () => {
  it('2/4 = 1/2', () => {
    expect(areEqual(fraction(2, 4), fraction(1, 2))).toBe(true);
  });
  
  it('3/6 = 1/2', () => {
    expect(areEqual(fraction(3, 6), fraction(1, 2))).toBe(true);
  });
  
  it('1/3 ≠ 1/4', () => {
    expect(areEqual(fraction(1, 3), fraction(1, 4))).toBe(false);
  });
});

describe('Fraction Engine - LCM', () => {
  it('lcm(4, 6) = 12', () => {
    expect(lcm(4, 6)).toBe(12);
  });
  
  it('lcm(3, 4) = 12', () => {
    expect(lcm(3, 4)).toBe(12);
  });
  
  it('lcm(5, 10) = 10', () => {
    expect(lcm(5, 10)).toBe(10);
  });
});

describe('Fraction Engine - fractionToString()', () => {
  it('should display whole number for denominator 1', () => {
    expect(fractionToString(fraction(4, 2))).toBe('2');
  });
  
  it('should display fraction correctly', () => {
    expect(fractionToString(fraction(3, 4))).toBe('3/4');
  });
});

describe('Fraction Engine - generateEquivalentFractions()', () => {
  it('should generate correct equivalents for 1/2', () => {
    const eqs = generateEquivalentFractions(fraction(1, 2), 4);
    expect(eqs.length).toBe(4);
    for (const eq of eqs) {
      expect(areEqual(eq, fraction(1, 2))).toBe(true);
    }
  });
});

describe('Fraction Engine - toDecimal()', () => {
  it('3/4 = 0.75', () => {
    expect(toDecimal(fraction(3, 4))).toBeCloseTo(0.75);
  });
  
  it('1/3 ≈ 0.333', () => {
    expect(toDecimal(fraction(1, 3))).toBeCloseTo(0.333, 3);
  });
});

describe('Fraction Engine - explainComparison()', () => {
  it('should explain 3/5 > 1/2', () => {
    const explanation = explainComparison(fraction(3, 5), fraction(1, 2));
    expect(explanation).toContain('büyüktür');
    expect(explanation).toContain('10'); // LCM of 5 and 2
  });
});

describe('Fraction Engine - toMixedFraction() & fromMixedFraction()', () => {
  it('should convert 7/4 to 1 and 3/4', () => {
    const mixed = toMixedFraction({ numerator: 7, denominator: 4 });
    expect(mixed.whole).toBe(1);
    expect(mixed.remainder.numerator).toBe(3);
    expect(mixed.remainder.denominator).toBe(4);
  });

  it('should convert 3/4 to 0 and 3/4', () => {
    const mixed = toMixedFraction({ numerator: 3, denominator: 4 });
    expect(mixed.whole).toBe(0);
    expect(mixed.remainder.numerator).toBe(3);
    expect(mixed.remainder.denominator).toBe(4);
  });

  it('should convert 8/4 to 2 and 0/4', () => {
    const mixed = toMixedFraction({ numerator: 8, denominator: 4 });
    expect(mixed.whole).toBe(2);
    expect(mixed.remainder.numerator).toBe(0);
  });

  it('should convert mixed fraction back to improper fraction', () => {
    const improper = fromMixedFraction(1, { numerator: 3, denominator: 4 });
    expect(improper.numerator).toBe(7);
    expect(improper.denominator).toBe(4);
  });
});

describe('Fraction Engine - expandFraction()', () => {
  it('should expand 2/3 by factor 3 to 6/9', () => {
    const exp = expandFraction({ numerator: 2, denominator: 3 }, 3);
    expect(exp.expanded.numerator).toBe(6);
    expect(exp.expanded.denominator).toBe(9);
    expect(areEqual(exp.original, exp.expanded)).toBe(true);
  });
});

describe('Fraction Engine - getCommonDenominatorSteps()', () => {
  it('should compute common denominator steps for 1/2 + 1/3', () => {
    const info = getCommonDenominatorSteps(
      { numerator: 1, denominator: 2 },
      { numerator: 1, denominator: 3 },
      'add'
    );
    expect(info.commonDen).toBe(6);
    expect(info.aFactor).toBe(3);
    expect(info.bFactor).toBe(2);
    expect(info.expandedA.numerator).toBe(3);
    expect(info.expandedB.numerator).toBe(2);
    expect(info.result.numerator).toBe(5);
    expect(info.result.denominator).toBe(6);
    expect(info.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('should compute common denominator steps for 3/4 - 1/2', () => {
    const info = getCommonDenominatorSteps(
      { numerator: 3, denominator: 4 },
      { numerator: 1, denominator: 2 },
      'subtract'
    );
    expect(info.commonDen).toBe(4);
    expect(info.result.numerator).toBe(1);
    expect(info.result.denominator).toBe(4);
  });
});

describe('Fraction Engine - getGridDimensions()', () => {
  it('should return suitable row and column layouts for common denominators', () => {
    expect(getGridDimensions(4)).toEqual({ rows: 2, cols: 2 });
    expect(getGridDimensions(6)).toEqual({ rows: 2, cols: 3 });
    expect(getGridDimensions(8)).toEqual({ rows: 2, cols: 4 });
    expect(getGridDimensions(9)).toEqual({ rows: 3, cols: 3 });
    expect(getGridDimensions(12)).toEqual({ rows: 3, cols: 4 });
    expect(getGridDimensions(16)).toEqual({ rows: 4, cols: 4 });
  });
});

