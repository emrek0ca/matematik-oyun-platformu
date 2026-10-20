import { describe, it, expect } from 'vitest';
import {
  generateCircleTask,
  generateBarTask,
  generateNumberLineTask,
  generateOperationsTask,
  fraction,
  fractionToString,
  compare,
  add,
  subtract,
} from '../engines/fractionEngine';

describe('Kesir Atölyesi - 4 Etkileşimli Çalışma Alanı Testleri', () => {
  it('Alan A (Kesir Daireleri): Görev üretimi ve kesir doğrulaması', () => {
    const task = generateCircleTask('kolay');
    expect(task.type).toBe('circle');
    expect(task.targetFraction.denominator).toBeGreaterThanOrEqual(2);
    expect(task.targetFraction.numerator).toBeGreaterThan(0);
    expect(task.hint1).toBeDefined();
    expect(task.hint2).toBeDefined();
    expect(task.hint3).toBeDefined();
  });

  it('Alan B (Kesir Çubukları): 1/2 ile 2/4 kesirlerinin eşitliğini kanıtlamalı', () => {
    const f1 = fraction(1, 2);
    const f2 = fraction(2, 4);
    expect(compare(f1, f2)).toBe(0);

    const task = generateBarTask('kolay');
    expect(task.type).toBe('bars');
    expect(compare(task.targetFraction, task.secondaryFraction!)).toBe(0);
  });

  it('Alan C (Sayı Doğrusu): 3/4 kesrinin sayı doğrusu koordinatını kesin hesaplamalı', () => {
    const f = fraction(3, 4);
    const val = f.numerator / f.denominator;
    expect(val).toBe(0.75);

    const task = generateNumberLineTask('zor');
    expect(task.type).toBe('numberline');
    expect(task.maxRange).toBe(2); // Zor seviyede bileşik kesirler (0-2 aralığı)
  });

  it('Alan D (Kesir İşlemleri): 1/2 + 1/4 = 3/4 işlemini ortak parçalama ile doğrulamalı', () => {
    const a = fraction(1, 2);
    const b = fraction(1, 4);
    const res = add(a, b);
    expect(fractionToString(res)).toBe('3/4');

    const task = generateOperationsTask('orta');
    expect(task.type).toBe('operations');
    expect(task.hint1).toContain('Paydaları farklı');
  });

  it('Alan D: 1/3 + 1/3 = 2/3 aynı paydalı birleşimi doğrulamalı', () => {
    const a = fraction(1, 3);
    const b = fraction(1, 3);
    const res = add(a, b);
    expect(fractionToString(res)).toBe('2/3');
  });
});
