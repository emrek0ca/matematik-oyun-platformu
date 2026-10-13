/**
 * Cebir Terazisi - Matematik Motoru Testleri
 */
import { describe, it, expect } from 'vitest';
import {
  gcd,
  simplifyFraction,
  solveLinearEquation,
  evaluateSide,
  checkBalance,
  applyOperation,
  generateEquation,
  validateStudentAnswer,
  equationToString,
  generateSolutionSteps,
  getRecommendedOperations,
  getEquationStage,
} from '../engines/algebraEngine';

describe('Algebra Engine - GCD', () => {
  it('should compute GCD correctly', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(7, 3)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(100, 25)).toBe(25);
  });
});

describe('Algebra Engine - simplifyFraction', () => {
  it('should simplify 4/8 to 1/2', () => {
    const f = simplifyFraction(4, 8);
    expect(f.numerator).toBe(1);
    expect(f.denominator).toBe(2);
  });
  
  it('should simplify negative fractions', () => {
    const f = simplifyFraction(-6, 9);
    expect(f.numerator).toBe(-2);
    expect(f.denominator).toBe(3);
  });
  
  it('should handle zero numerator', () => {
    const f = simplifyFraction(0, 5);
    expect(f.numerator).toBe(0);
    expect(f.denominator).toBe(1);
  });
  
  it('should throw on zero denominator', () => {
    expect(() => simplifyFraction(1, 0)).toThrow();
  });
});

describe('Algebra Engine - solveLinearEquation', () => {
  it('x + 3 = 7 → x = 4', () => {
    const sol = solveLinearEquation({ leftA: 1, leftB: 3, rightA: 0, rightB: 7 });
    expect(sol.numerator).toBe(4);
    expect(sol.denominator).toBe(1);
  });
  
  it('2x + 4 = 10 → x = 3', () => {
    const sol = solveLinearEquation({ leftA: 2, leftB: 4, rightA: 0, rightB: 10 });
    expect(sol.numerator).toBe(3);
    expect(sol.denominator).toBe(1);
  });
  
  it('3x + 2 = 14 → x = 4', () => {
    const sol = solveLinearEquation({ leftA: 3, leftB: 2, rightA: 0, rightB: 14 });
    expect(sol.numerator).toBe(4);
    expect(sol.denominator).toBe(1);
  });
  
  it('2x + 1 = x + 5 → x = 4', () => {
    const sol = solveLinearEquation({ leftA: 2, leftB: 1, rightA: 1, rightB: 5 });
    expect(sol.numerator).toBe(4);
    expect(sol.denominator).toBe(1);
  });
  
  it('should handle negative solutions', () => {
    // x + 5 = 2 → x = -3
    const sol = solveLinearEquation({ leftA: 1, leftB: 5, rightA: 0, rightB: 2 });
    expect(sol.numerator).toBe(-3);
    expect(sol.denominator).toBe(1);
  });
  
  it('should detect no solution (0x = 5)', () => {
    expect(() => solveLinearEquation({ leftA: 2, leftB: 0, rightA: 2, rightB: 5 }))
      .toThrow();
  });
  
  it('should detect infinite solutions (0x = 0)', () => {
    expect(() => solveLinearEquation({ leftA: 3, leftB: 2, rightA: 3, rightB: 2 }))
      .toThrow();
  });
});

describe('Algebra Engine - checkBalance', () => {
  it('should confirm balance for correct solution', () => {
    const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 };
    const x = { numerator: 4, denominator: 1 };
    expect(checkBalance(eq, x)).toBe(true);
  });
  
  it('should detect imbalance', () => {
    const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 };
    const x = { numerator: 3, denominator: 1 };
    expect(checkBalance(eq, x)).toBe(false);
  });
});

describe('Algebra Engine - applyOperation', () => {
  const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 };
  
  it('should subtract from both sides', () => {
    const result = applyOperation(eq, { type: 'subtract', value: 3, applyTo: 'both' });
    expect(result.isValid).toBe(true);
    expect(result.newEq.leftB).toBe(0);
    expect(result.newEq.rightB).toBe(4);
  });
  
  it('should reject single-side operation', () => {
    const result = applyOperation(eq, { type: 'subtract', value: 3, applyTo: 'left' });
    expect(result.isValid).toBe(false);
  });
  
  it('should reject division by zero', () => {
    const result = applyOperation(eq, { type: 'divide', value: 0, applyTo: 'both' });
    expect(result.isValid).toBe(false);
  });
  
  it('should reject multiplication by zero', () => {
    const result = applyOperation(eq, { type: 'multiply', value: 0, applyTo: 'both' });
    expect(result.isValid).toBe(false);
  });
});

describe('Algebra Engine - validateStudentAnswer', () => {
  it('should accept correct answer', () => {
    const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 };
    const result = validateStudentAnswer(eq, 4);
    expect(result.isCorrect).toBe(true);
  });
  
  it('should reject wrong answer with explanation', () => {
    const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 };
    const result = validateStudentAnswer(eq, 3);
    expect(result.isCorrect).toBe(false);
    expect(result.explanation).toContain('Yanlış');
  });
});

describe('Algebra Engine - generateEquation', () => {
  it('should generate solvable easy equations', () => {
    for (let i = 0; i < 20; i++) {
      const eq = generateEquation('kolay');
      const sol = solveLinearEquation(eq);
      expect(sol.denominator).toBe(1); // Integer solution
      expect(sol.numerator).toBeGreaterThan(0);
      expect(checkBalance(eq, sol)).toBe(true);
    }
  });
  
  it('should generate solvable medium equations', () => {
    for (let i = 0; i < 20; i++) {
      const eq = generateEquation('orta');
      const sol = solveLinearEquation(eq);
      expect(sol.denominator).toBe(1);
      expect(checkBalance(eq, sol)).toBe(true);
    }
  });
});

describe('Algebra Engine - equationToString', () => {
  it('should format simple equation', () => {
    const str = equationToString({ leftA: 1, leftB: 3, rightA: 0, rightB: 7 });
    expect(str).toBe('x + 3 = 7');
  });
  
  it('should format equation with coefficient', () => {
    const str = equationToString({ leftA: 2, leftB: 4, rightA: 0, rightB: 10 });
    expect(str).toBe('2x + 4 = 10');
  });
});

describe('Algebra Engine - Recommended Operations & Stages', () => {
  it('should recommend eliminating right x when both sides have x', () => {
    const ops = getRecommendedOperations({ leftA: 3, leftB: 2, rightA: 1, rightB: 8 });
    expect(ops.some(op => op.isVariable && op.type === 'subtract' && op.value === 1)).toBe(true);
  });

  it('should recommend eliminating constant when left has constant', () => {
    const ops = getRecommendedOperations({ leftA: 2, leftB: 4, rightA: 0, rightB: 10 });
    expect(ops.some(op => !op.isVariable && op.type === 'subtract' && op.value === 4)).toBe(true);
  });

  it('should recommend division when coefficient > 1', () => {
    const ops = getRecommendedOperations({ leftA: 3, leftB: 0, rightA: 0, rightB: 9 });
    expect(ops.some(op => op.type === 'divide' && op.value === 3)).toBe(true);
  });

  it('should return correct progress stages', () => {
    const s1 = getEquationStage({ leftA: 3, leftB: 2, rightA: 1, rightB: 8 });
    expect(s1.stage).toBe(1);

    const s2 = getEquationStage({ leftA: 2, leftB: 2, rightA: 0, rightB: 8 });
    expect(s2.stage).toBe(2);

    const s3 = getEquationStage({ leftA: 2, leftB: 0, rightA: 0, rightB: 6 });
    expect(s3.stage).toBe(3);

    const s4 = getEquationStage({ leftA: 1, leftB: 0, rightA: 0, rightB: 3 });
    expect(s4.stage).toBe(4);
    expect(s4.isIsolated).toBe(true);
    expect(s4.isolatedValue).toBe(3);
  });
});
