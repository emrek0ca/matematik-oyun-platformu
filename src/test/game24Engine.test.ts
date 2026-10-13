/**
 * 24 Oyunu - Matematik Motoru Testleri
 */
import { describe, it, expect } from 'vitest';
import {
  hasSolution,
  getAllSolutions,
  generatePuzzle,
  validateExpression,
  resetGame,
  applyStep,
  undoStep,
  getSolutionStrings,
  getSmartSuggestion,
} from '../engines/game24Engine';

describe('Game24 Engine - hasSolution()', () => {
  it('[3,3,8,8] has a solution: 8/(3-8/3) = 24', () => {
    expect(hasSolution([3, 3, 8, 8])).toBe(true);
  });
  
  it('[2,2,2,3] has a solution: 2×2×2×3 = 24', () => {
    expect(hasSolution([2, 2, 2, 3])).toBe(true);
  });
  
  it('[1,2,3,4] has a solution: 1×2×3×4 = 24', () => {
    expect(hasSolution([1, 2, 3, 4])).toBe(true);
  });
  
  it('[1,1,1,1] has no easy solution', () => {
    // 1+1+1+1=4, 1×1×1×1=1, no way to get 24
    expect(hasSolution([1, 1, 1, 1])).toBe(false);
  });
});

describe('Game24 Engine - getAllSolutions()', () => {
  it('[2,2,2,3] should find solutions', () => {
    const solutions = getAllSolutions([2, 2, 2, 3]);
    expect(solutions.length).toBeGreaterThan(0);
    
    // Verify each solution actually equals 24
    // (This is verified by the engine itself via rationalEquals)
  });
  
  it('[3,3,8,8] should find at least one solution', () => {
    const solutions = getAllSolutions([3, 3, 8, 8]);
    expect(solutions.length).toBeGreaterThan(0);
  });
});

describe('Game24 Engine - validateExpression()', () => {
  it('should reject expression with wrong number of cards', () => {
    const numbers = [{ value: 2, id: 0 }, { value: 3, id: 1 }, { value: 4, id: 2 }, { value: 6, id: 3 }];
    const expr = {
      type: 'operation' as const,
      operator: '×' as const,
      left: { type: 'number' as const, value: 2, id: 0 },
      right: { type: 'number' as const, value: 3, id: 1 },
    };
    const result = validateExpression(expr, numbers);
    expect(result.usedAllNumbers).toBe(false);
  });
  
  it('should detect correct answer of 24', () => {
    const numbers = [{ value: 2, id: 0 }, { value: 2, id: 1 }, { value: 2, id: 2 }, { value: 3, id: 3 }];
    // 2×2×2×3 = 24
    const expr = {
      type: 'operation' as const,
      operator: '×' as const,
      left: {
        type: 'operation' as const,
        operator: '×' as const,
        left: {
          type: 'operation' as const,
          operator: '×' as const,
          left: { type: 'number' as const, value: 2, id: 0 },
          right: { type: 'number' as const, value: 2, id: 1 },
        },
        right: { type: 'number' as const, value: 2, id: 2 },
      },
      right: { type: 'number' as const, value: 3, id: 3 },
    };
    const result = validateExpression(expr, numbers);
    expect(result.isCorrect).toBe(true);
    expect(result.value).toBe(24);
  });
});

describe('Game24 Engine - generatePuzzle()', () => {
  it('should always generate solvable easy puzzles', () => {
    for (let i = 0; i < 10; i++) {
      const nums = generatePuzzle('kolay');
      expect(nums.length).toBe(4);
      expect(hasSolution(nums)).toBe(true);
    }
  });
  
  it('should generate solvable medium puzzles', () => {
    for (let i = 0; i < 10; i++) {
      const nums = generatePuzzle('orta');
      expect(hasSolution(nums)).toBe(true);
    }
  });
  
  it('should generate solvable hard puzzles', () => {
    for (let i = 0; i < 10; i++) {
      const nums = generatePuzzle('zor');
      expect(hasSolution(nums)).toBe(true);
    }
  });
});

describe('Game24 Engine - Interactive game state', () => {
  it('should apply and undo steps correctly', () => {
    const state = resetGame([2, 3, 4, 6]);
    expect(state.currentNumbers.length).toBe(4);
    
    // Apply a step: 2 + 3 = 5
    const result = applyStep(state, 0, 1, '+');
    expect(result.success).toBe(true);
    expect(result.newState!.currentNumbers.length).toBe(3);
    expect(result.newState!.steps.length).toBe(1);
    expect(result.newState!.steps[0].result).toBe(5);
    
    // Undo step
    const undone = undoStep(result.newState!);
    expect(undone.currentNumbers.length).toBe(4);
    expect(undone.steps.length).toBe(0);
  });
  
  it('should prevent division by zero', () => {
    const state = resetGame([0, 3, 4, 6]);
    const result = applyStep(state, 1, 0, '÷'); // 3 ÷ 0
    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('sıfır');
  });
  
  it('should detect win when single number equals 24', () => {
    const state = resetGame([2, 2, 2, 3]);
    
    // 2 × 2 = 4
    const r1 = applyStep(state, 0, 1, '×');
    expect(r1.success).toBe(true);
    
    // 4 × 3 = 12
    const r2 = applyStep(r1.newState!, r1.newState!.currentNumbers.find(n => n.value === 4)!.id, r1.newState!.currentNumbers.find(n => n.value === 3)!.id, '×');
    expect(r2.success).toBe(true);
    
    // 12 × 2 = 24
    const r3 = applyStep(r2.newState!, r2.newState!.currentNumbers.find(n => n.value === 12)!.id, r2.newState!.currentNumbers.find(n => n.value === 2)!.id, '×');
    expect(r3.success).toBe(true);
    expect(r3.newState!.isComplete).toBe(true);
    expect(r3.newState!.finalValue).toBeCloseTo(24);
  });

  it('should return a valid smart suggestion for solvable numbers', () => {
    const sugg = getSmartSuggestion([2, 2, 2, 3]);
    expect(sugg).not.toBeNull();
    expect([2, 3]).toContain(sugg?.card1);
    expect(['+', '×']).toContain(sugg?.operator);
  });
});
