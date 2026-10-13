/**
 * NIM Oyunu - Matematik Motoru Testleri
 */
import { describe, it, expect } from 'vitest';
import {
  calculateNimSum,
  isGameOver,
  isValidMove,
  makeMove,
  findOptimalMove,
  computerMove,
  analyzePosition,
  buildBinaryTable,
  createInitialState,
  generateHeaps,
} from '../engines/nimEngine';

describe('NIM Engine - calculateNimSum()', () => {
  it('3 XOR 4 XOR 5 = 2', () => {
    expect(calculateNimSum([3, 4, 5])).toBe(2);
  });
  
  it('1 XOR 2 XOR 3 = 0', () => {
    expect(calculateNimSum([1, 2, 3])).toBe(0);
  });
  
  it('single heap: nimSum = heap value', () => {
    expect(calculateNimSum([7])).toBe(7);
  });
  
  it('all zeros: nimSum = 0', () => {
    expect(calculateNimSum([0, 0, 0])).toBe(0);
  });
  
  it('should handle [3,5,7] = 1', () => {
    // 011 XOR 101 XOR 111 = 001 = 1
    expect(calculateNimSum([3, 5, 7])).toBe(1);
  });
});

describe('NIM Engine - isGameOver()', () => {
  it('should detect game over with all zeros', () => {
    expect(isGameOver([0, 0, 0])).toBe(true);
  });
  
  it('should not be game over with non-zero heaps', () => {
    expect(isGameOver([1, 0, 0])).toBe(false);
  });
  
  it('should not be game over with multiple heaps', () => {
    expect(isGameOver([3, 4, 5])).toBe(false);
  });
});

describe('NIM Engine - isValidMove()', () => {
  const heaps = [3, 4, 5];
  
  it('should accept valid move', () => {
    expect(isValidMove(heaps, 0, 2)).toBe(true);
  });
  
  it('should reject move removing more than heap size', () => {
    expect(isValidMove(heaps, 0, 4)).toBe(false);
  });
  
  it('should reject move of 0 objects', () => {
    expect(isValidMove(heaps, 1, 0)).toBe(false);
  });
  
  it('should reject invalid heap index', () => {
    expect(isValidMove(heaps, 10, 1)).toBe(false);
  });
  
  it('should accept removing entire heap', () => {
    expect(isValidMove(heaps, 0, 3)).toBe(true);
  });
});

describe('NIM Engine - makeMove()', () => {
  it('should execute valid move', () => {
    const state = createInitialState([3, 4, 5]);
    const result = makeMove(state, 0, 2);
    
    expect(result.success).toBe(true);
    expect(result.newState!.heaps[0]).toBe(1);
    expect(result.newState!.moveHistory.length).toBe(1);
  });
  
  it('should detect game over', () => {
    const state = createInitialState([0, 0, 1]);
    const result = makeMove(state, 2, 1);
    
    expect(result.success).toBe(true);
    expect(result.newState!.isGameOver).toBe(true);
    expect(result.newState!.winner).toBe(0); // Player 0 took last
  });
  
  it('should switch player', () => {
    const state = createInitialState([3, 4, 5]);
    const result = makeMove(state, 0, 1);
    
    expect(result.newState!.currentPlayer).toBe(1);
  });
});

describe('NIM Engine - findOptimalMove()', () => {
  it('should find winning move for [3,4,5] (nimSum=2)', () => {
    // NimSum = 2, need to reduce pile 0 from 3 to 3^2=1
    const move = findOptimalMove([3, 4, 5]);
    expect(move).not.toBeNull();
    expect(move!.isWinning).toBe(true);
    
    // After move, nimSum should be 0
    const heaps = [3, 4, 5];
    heaps[move!.heapIndex] -= move!.objectsToRemove;
    expect(calculateNimSum(heaps)).toBe(0);
  });
  
  it('should recognize losing position [1,2,3] (nimSum=0)', () => {
    const move = findOptimalMove([1, 2, 3]);
    expect(move).not.toBeNull();
    expect(move!.isWinning).toBe(false);
  });
  
  it('should return null for empty game', () => {
    const move = findOptimalMove([0, 0, 0]);
    expect(move).toBeNull();
  });
  
  it('optimal move always results in nimSum=0 when winning', () => {
    const testCases = [
      [1, 2],
      [4, 5, 6],
      [7, 11, 13],
      [2, 5, 8],
    ];
    
    for (const heaps of testCases) {
      const nimSum = calculateNimSum(heaps);
      if (nimSum !== 0) {
        const move = findOptimalMove(heaps);
        expect(move).not.toBeNull();
        const newHeaps = [...heaps];
        newHeaps[move!.heapIndex] -= move!.objectsToRemove;
        expect(calculateNimSum(newHeaps)).toBe(0);
      }
    }
  });
});

describe('NIM Engine - computerMove()', () => {
  it('hard mode should play optimally', () => {
    const heaps = [3, 4, 5]; // nimSum = 2 (winning)
    
    for (let i = 0; i < 5; i++) {
      const move = computerMove(heaps, 'zor');
      const newHeaps = [...heaps];
      newHeaps[move.heapIndex] -= move.objectsToRemove;
      expect(calculateNimSum(newHeaps)).toBe(0); // Always optimal
    }
  });
  
  it('easy mode should make valid moves', () => {
    const heaps = [3, 4, 5];
    
    for (let i = 0; i < 10; i++) {
      const move = computerMove(heaps, 'kolay');
      expect(isValidMove(heaps, move.heapIndex, move.objectsToRemove)).toBe(true);
    }
  });
});

describe('NIM Engine - analyzePosition()', () => {
  it('should correctly identify winning position', () => {
    const analysis = analyzePosition([3, 4, 5]);
    expect(analysis.nimSum).toBe(2);
    expect(analysis.isWinningPosition).toBe(true);
    expect(analysis.optimalMove).not.toBeUndefined();
  });
  
  it('should correctly identify losing position', () => {
    const analysis = analyzePosition([1, 2, 3]);
    expect(analysis.nimSum).toBe(0);
    expect(analysis.isWinningPosition).toBe(false);
    expect(analysis.optimalMove).toBeUndefined();
  });
});

describe('NIM Engine - buildBinaryTable()', () => {
  it('should build correct binary table for [3,4,5]', () => {
    const table = buildBinaryTable([3, 4, 5]);
    
    expect(table.rows.length).toBe(3);
    expect(table.nimSumRow.value).toBe(2);
    
    // Check binary representations
    const heap1Decimal = parseInt(table.rows[0].bits.join(''), 2);
    expect(heap1Decimal).toBe(3);
  });
});

describe('NIM Engine - generateHeaps()', () => {
  it('should generate heaps with valid sizes', () => {
    for (let i = 0; i < 20; i++) {
      const heaps = generateHeaps('kolay');
      expect(heaps.length).toBeGreaterThan(0);
      expect(heaps.every(h => h > 0)).toBe(true);
    }
  });
  
  it('hard mode should generate larger heaps', () => {
    for (let i = 0; i < 10; i++) {
      const heaps = generateHeaps('zor');
      const sum = heaps.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(5);
    }
  });
});

describe('NIM Engine - Edge Cases', () => {
  it('should handle single heap game', () => {
    const state = createInitialState([5]);
    // Single heap: first player takes all and wins
    const result = makeMove(state, 0, 5);
    expect(result.success).toBe(true);
    expect(result.newState!.isGameOver).toBe(true);
    expect(result.newState!.winner).toBe(0);
  });
  
  it('should handle one-element heaps', () => {
    const heaps = [1, 1, 1];
    const nimSum = calculateNimSum(heaps);
    expect(nimSum).toBe(1); // 1 XOR 1 XOR 1 = 1
    
    const move = findOptimalMove(heaps);
    expect(move).not.toBeNull();
    expect(move!.isWinning).toBe(true);
  });
  
  it('should not make invalid move on empty heap', () => {
    const state = createInitialState([0, 5, 3]);
    const result = makeMove(state, 0, 1);
    expect(result.success).toBe(false);
  });
});
