import { describe, it, expect } from 'vitest';
import {
  evaluateFreeScale,
  getProgressiveHints,
  generateEquation,
  solveLinearEquation,
  applyOperation,
} from '../engines/algebraEngine';

describe('Cebir Terazisi - Gelişmiş Eğitimsel Simülasyon Testleri', () => {
  it('Mod A (Serbest Terazi): Sol ve sağ kütle eşit olduğunda denge ve eşitliği tespit etmeli (3 + 4 = 7)', () => {
    const leftItems = [
      { id: '1', type: 'constant' as const, value: 3, label: '3' },
      { id: '2', type: 'constant' as const, value: 4, label: '4' },
    ];
    const rightItems = [
      { id: '3', type: 'constant' as const, value: 7, label: '7' },
    ];

    const result = evaluateFreeScale(leftItems, rightItems);
    expect(result.isBalanced).toBe(true);
    expect(result.diff).toBe(0);
    expect(result.equationDisplay).toContain('=');
    expect(result.leftMass).toBe(7);
    expect(result.rightMass).toBe(7);
  });

  it('Mod A (Serbest Terazi): Bilinmeyen x kutusu dengelendiğinde x değerini keşfetmeli', () => {
    const leftItems = [
      { id: '1', type: 'x' as const, value: 1, label: 'x' },
      { id: '2', type: 'constant' as const, value: 3, label: '3' },
    ];
    const rightItems = [
      { id: '3', type: 'constant' as const, value: 7, label: '7' },
    ];

    // Gizli x = 4
    const result = evaluateFreeScale(leftItems, rightItems, 4);
    expect(result.isBalanced).toBe(true);
    expect(result.discoveredX).toBe(4);
  });

  it('Mod B (Denklem Çözme): 3 Aşamalı kademeli ipucu doğru pedagojik seviyeleri üretmeli', () => {
    const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 }; // x + 3 = 7

    const hint1 = getProgressiveHints(eq, 1);
    expect(hint1.level).toBe(1);
    expect(hint1.question).toContain('x\'in yanında duran');

    const hint2 = getProgressiveHints(eq, 2);
    expect(hint2.level).toBe(2);
    expect(hint2.visualCue).toContain('+3');

    const hint3 = getProgressiveHints(eq, 3);
    expect(hint3.level).toBe(3);
    expect(hint3.actionStep).toContain('3');
  });

  it('Mod B: İki tarafa aynı işlem uygulandığında denge korunmalı', () => {
    const eq = { leftA: 1, leftB: 3, rightA: 0, rightB: 7 }; // x + 3 = 7
    const trueX = solveLinearEquation(eq); // 4

    const opResult = applyOperation(eq, { type: 'subtract', value: 3, applyTo: 'both' });
    expect(opResult.isValid).toBe(true);
    expect(opResult.newEq.leftA).toBe(1);
    expect(opResult.newEq.leftB).toBe(0);
    expect(opResult.newEq.rightB).toBe(4);

    // Yeni denklemde sol kütle = sağ kütle
    const leftMass = opResult.newEq.leftA * (trueX.numerator / trueX.denominator) + opResult.newEq.leftB;
    const rightMass = opResult.newEq.rightA * (trueX.numerator / trueX.denominator) + opResult.newEq.rightB;
    expect(leftMass).toBe(rightMass);
  });
});
