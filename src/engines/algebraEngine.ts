/**
 * Cebir Terazisi - Matematik Motoru
 * ax + b = cx + d formundaki denklemleri çözer
 * Matematiksel kesinlik: tam sayı aritmetiği ve kesirli sayı desteği
 */

export interface Fraction {
  numerator: number;
  denominator: number;
}

export interface Equation {
  // ax + b = cx + d
  leftA: number;   // x katsayısı (sol)
  leftB: number;   // sabit terim (sol)
  rightA: number;  // x katsayısı (sağ)
  rightB: number;  // sabit terim (sağ)
}

export interface EquationState {
  equation: Equation;
  solution: Fraction; // x = p/q
  steps: SolutionStep[];
  isSolved: boolean;
  balance: number; // sol - sağ değer (görseller için)
}

export interface SolutionStep {
  description: string;
  operation: string;
  leftSide: string;
  rightSide: string;
  isValid: boolean;
  errorMessage?: string;
}

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface PlayerOperation {
  type: Operation;
  value: number;
  isVariable?: boolean; // true ise x'li terim üzerinde işlem yapılır (örn: -1x veya +2x)
  applyTo: 'both' | 'left' | 'right';
}

/** En Büyük Ortak Bölen (Öklid algoritması) */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a === 0 ? 1 : a;
}

/** Kesir sadeleştirme */
export function simplifyFraction(num: number, den: number): Fraction {
  if (den === 0) throw new Error('Payda sıfır olamaz');
  if (num === 0) return { numerator: 0, denominator: 1 };
  
  const sign = (num < 0) !== (den < 0) ? -1 : 1;
  const absNum = Math.abs(num);
  const absDen = Math.abs(den);
  const common = gcd(absNum, absDen);
  
  return {
    numerator: sign * (absNum / common),
    denominator: absDen / common,
  };
}

/** ax + b = cx + d denklemi çöz → x = (d - b) / (a - c) */
export function solveLinearEquation(eq: Equation): Fraction {
  const { leftA, leftB, rightA, rightB } = eq;
  
  // (a - c)x = d - b
  const coeffX = leftA - rightA;
  const constant = rightB - leftB;
  
  if (coeffX === 0) {
    if (constant === 0) {
      // Sonsuz çözüm - özel durum
      throw new Error('Sonsuz çözüm: denklem her x için geçerli');
    } else {
      // Çözümsüz
      throw new Error('Çözüm yok: denklem tutarsız');
    }
  }
  
  return simplifyFraction(constant, coeffX);
}

/** Denklemin sol tarafını değerlendir: ax + b */
export function evaluateSide(a: number, b: number, x: Fraction): Fraction {
  // a * (x_num/x_den) + b = (a*x_num + b*x_den) / x_den
  const num = a * x.numerator + b * x.denominator;
  const den = x.denominator;
  return simplifyFraction(num, den);
}

/** Denklem denge kontrolü: sol = sağ mı? */
export function checkBalance(eq: Equation, x: Fraction): boolean {
  const left = evaluateSide(eq.leftA, eq.leftB, x);
  const right = evaluateSide(eq.rightA, eq.rightB, x);
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

/** Oyuncu işlemini doğrula ve uygula */
export function applyOperation(
  eq: Equation,
  op: PlayerOperation
): { newEq: Equation; newEquation: Equation; isValid: boolean; message: string; errorMessage?: string } {
  
  if (op.applyTo !== 'both') {
    return {
      newEq: eq,
      newEquation: eq,
      isValid: false,
      message: 'İşlem her iki tarafa da eşit şekilde uygulanmalıdır. Denklik ilkesi: bir tarafa yapılan işlem diğer tarafa da yapılmalıdır.',
      errorMessage: 'İşlem her iki tarafa da eşit şekilde uygulanmalıdır.',
    };
  }

  let { leftA, leftB, rightA, rightB } = eq;
  const v = op.value;

  switch (op.type) {
    case 'add': {
      const nextEq = op.isVariable
        ? { leftA: leftA + v, leftB, rightA: rightA + v, rightB }
        : { leftA, leftB: leftB + v, rightA, rightB: rightB + v };
      const msg = `Her iki tarafa ${op.isVariable ? (v === 1 ? 'x' : `${v}x`) : v} eklendi: Denklik korundu ✓`;
      return { newEq: nextEq, newEquation: nextEq, isValid: true, message: msg };
    }

    case 'subtract': {
      const nextEq = op.isVariable
        ? { leftA: leftA - v, leftB, rightA: rightA - v, rightB }
        : { leftA, leftB: leftB - v, rightA, rightB: rightB - v };
      const msg = `Her iki taraftan ${op.isVariable ? (v === 1 ? 'x' : `${v}x`) : v} çıkarıldı: Denklik korundu ✓`;
      return { newEq: nextEq, newEquation: nextEq, isValid: true, message: msg };
    }

    case 'multiply': {
      if (v === 0) {
        return { newEq: eq, newEquation: eq, isValid: false, message: 'Sıfırla çarpma yasaktır: Denklem anlamsız hale gelir.', errorMessage: 'Sıfırla çarpma yapılamaz!' };
      }
      const nextEq = { leftA: leftA * v, leftB: leftB * v, rightA: rightA * v, rightB: rightB * v };
      return { newEq: nextEq, newEquation: nextEq, isValid: true, message: `Her iki taraf ${v} ile çarpıldı: Denklik korundu ✓` };
    }

    case 'divide': {
      if (v === 0) {
        return { newEq: eq, newEquation: eq, isValid: false, message: 'Sıfıra bölme tanımsızdır!', errorMessage: 'Sıfıra bölme tanımsızdır!' };
      }
      const nextEq = {
        leftA: leftA / v,
        leftB: leftB / v,
        rightA: rightA / v,
        rightB: rightB / v,
      };
      return { newEq: nextEq, newEquation: nextEq, isValid: true, message: `Her iki taraf ${v}'ye bölündü: Denklik korundu ✓` };
    }

    default:
      return { newEq: eq, newEquation: eq, isValid: false, message: 'Bilinmeyen işlem', errorMessage: 'Bilinmeyen işlem' };
  }
}

/** Terazi eğim açısını hesapla (derece cinsinden, -30 ile +30 arası) */
export function calculateTiltAngle(eq: Equation, xValue?: Fraction): number {
  // Bilinmeyen değeri kullanmadan önce bir x tahmini yap (görsel için)
  // Gerçek x değerini bilmiyoruz, ama sol ve sağ sabit terimleri karşılaştırabiliriz
  // Bu, x çözülene kadar denklemin durumunu göstermek içindir
  
  // Eğer denklemin sol katsayısı = sağ katsayısi → denge tamamen sabit terimlere bağlı
  if (eq.leftA === eq.rightA) {
    const diff = eq.leftB - eq.rightB;
    const maxDiff = Math.max(Math.abs(eq.leftB), Math.abs(eq.rightB), 1);
    return Math.max(-30, Math.min(30, (diff / maxDiff) * 30));
  }
  
  // x çözümünü hesapla
  try {
    const sol = solveLinearEquation(eq);
    const xVal = sol.numerator / sol.denominator;
    
    // Her iki tarafı değerlendir
    const leftVal = eq.leftA * xVal + eq.leftB;
    const rightVal = eq.rightA * xVal + eq.rightB;
    
    // Çözümde eşit olmalı, ancak görsel için küçük fark göster
    const diff = leftVal - rightVal;
    return Math.max(-30, Math.min(30, diff));
  } catch {
    // Çözümsüz durum
    return 0;
  }
}

/** Denklem string gösterimi */
export function equationToString(eq?: Equation): string {
  if (!eq) return '0 = 0';
  const formatSide = (a: number, b: number): string => {
    let parts: string[] = [];
    
    if (a !== 0) {
      if (a === 1) parts.push('x');
      else if (a === -1) parts.push('-x');
      else parts.push(`${a}x`);
    }
    
    if (b !== 0) {
      if (parts.length === 0) {
        parts.push(`${b}`);
      } else if (b > 0) {
        parts.push(`+ ${b}`);
      } else {
        parts.push(`- ${Math.abs(b)}`);
      }
    }
    
    if (parts.length === 0) return '0';
    return parts.join(' ');
  };
  
  return `${formatSide(eq.leftA, eq.leftB)} = ${formatSide(eq.rightA, eq.rightB)}`;
}

/** Zorluk seviyesine göre denklem üret */
export function generateEquation(difficulty: 'kolay' | 'orta' | 'zor'): Equation {
  const rand = (min: number, max: number) => 
    Math.floor(Math.random() * (max - min + 1)) + min;
  
  let eq: Equation;
  
  switch (difficulty) {
    case 'kolay':
      // x + b = c (sadece bir tarafta x, tam sayı çözüm)
      {
        const x = rand(1, 10);
        const b = rand(1, 10);
        eq = { leftA: 1, leftB: b, rightA: 0, rightB: x + b };
      }
      break;
      
    case 'orta':
      // ax + b = c veya ax + b = cx + d (tam sayı çözüm)
      {
        const x = rand(1, 8);
        const leftA = rand(1, 4);
        const leftB = rand(-5, 10);
        const rightA = rand(0, leftA - 1); // leftA > rightA olmalı
        const rightB = leftA * x + leftB - rightA * x;
        eq = { leftA, leftB, rightA, rightB };
      }
      break;
      
    case 'zor':
      // ax + b = cx + d (daha büyük sayılar, negatif olabilir)
      {
        const x = rand(-5, 15);
        const leftA = rand(2, 6);
        const leftB = rand(-10, 10);
        const rightA = rand(0, leftA - 1);
        const rightB = leftA * x + leftB - rightA * x;
        eq = { leftA, leftB, rightA, rightB };
      }
      break;
  }
  
  // Doğrulama: çözüm tam sayı mı?
  const sol = solveLinearEquation(eq!);
  if (sol.denominator !== 1) {
    // Yeniden dene
    return generateEquation(difficulty);
  }
  
  return eq!;
}

/** Öğrenci çözümü doğrula */
export function validateStudentAnswer(eq: Equation, studentX: number): {
  isCorrect: boolean;
  correctAnswer: Fraction;
  explanation: string;
} {
  const solution = solveLinearEquation(eq);
  const correctX = solution.numerator / solution.denominator;
  const isCorrect = Math.abs(studentX - correctX) < 1e-10;
  
  let explanation: string;
  if (isCorrect) {
    const leftVal = eq.leftA * correctX + eq.leftB;
    explanation = `Doğru! x = ${correctX} olduğunda sol taraf = ${leftVal}, sağ taraf = ${leftVal}. Denklik sağlandı ✓`;
  } else {
    const leftVal = eq.leftA * studentX + eq.leftB;
    const rightVal = eq.rightA * studentX + eq.rightB;
    explanation = `Yanlış. x = ${studentX} için sol taraf = ${leftVal}, sağ taraf = ${rightVal}. ${leftVal} ≠ ${rightVal}. Doğru cevap: x = ${solution.denominator === 1 ? solution.numerator : `${solution.numerator}/${solution.denominator}`}`;
  }
  
  return { isCorrect, correctAnswer: solution, explanation };
}

/** Adım adım çözüm üret */
export function generateSolutionSteps(originalEq: Equation): SolutionStep[] {
  const steps: SolutionStep[] = [];
  let eq = { ...originalEq };
  
  // Başlangıç durumu
  steps.push({
    description: 'Başlangıç denklemi',
    operation: '',
    leftSide: formatSide(eq.leftA, eq.leftB),
    rightSide: formatSide(eq.rightA, eq.rightB),
    isValid: true,
  });
  
  // Adım 1: x terimlerini bir tarafa topla
  if (eq.rightA !== 0) {
    const op = -eq.rightA;
    const result = applyOperation(eq, { type: op > 0 ? 'add' : 'subtract', value: Math.abs(op), applyTo: 'both' });
    // Aslında x terimlerini taşımak için özel işlem
    const newEq: Equation = {
      leftA: eq.leftA - eq.rightA,
      leftB: eq.leftB,
      rightA: 0,
      rightB: eq.rightB,
    };
    steps.push({
      description: `Her iki taraftan ${eq.rightA > 0 ? eq.rightA + 'x' : `(${eq.rightA}x)`} çıkar`,
      operation: `− ${eq.rightA}x`,
      leftSide: formatSide(newEq.leftA, newEq.leftB),
      rightSide: formatSide(newEq.rightA, newEq.rightB),
      isValid: true,
    });
    eq = newEq;
  }
  
  // Adım 2: Sabit terimleri diğer tarafa taşı
  if (eq.leftB !== 0) {
    const newEq: Equation = {
      leftA: eq.leftA,
      leftB: 0,
      rightA: eq.rightA,
      rightB: eq.rightB - eq.leftB,
    };
    const opStr = eq.leftB > 0 
      ? `Her iki taraftan ${eq.leftB} çıkar`
      : `Her iki tarafa ${Math.abs(eq.leftB)} ekle`;
    steps.push({
      description: opStr,
      operation: eq.leftB > 0 ? `− ${eq.leftB}` : `+ ${Math.abs(eq.leftB)}`,
      leftSide: formatSide(newEq.leftA, newEq.leftB),
      rightSide: formatSide(newEq.rightA, newEq.rightB),
      isValid: true,
    });
    eq = newEq;
  }
  
  // Adım 3: x katsayısına böl
  if (eq.leftA !== 1 && eq.leftA !== 0) {
    const sol = simplifyFraction(eq.rightB, eq.leftA);
    steps.push({
      description: `Her iki tarafı ${eq.leftA}'ya böl`,
      operation: `÷ ${eq.leftA}`,
      leftSide: 'x',
      rightSide: sol.denominator === 1 ? `${sol.numerator}` : `${sol.numerator}/${sol.denominator}`,
      isValid: true,
    });
  }
  
  // Sonuç
  const solution = solveLinearEquation(originalEq);
  steps.push({
    description: 'Çözüm bulundu!',
    operation: '',
    leftSide: 'x',
    rightSide: solution.denominator === 1 
      ? `${solution.numerator}` 
      : `${solution.numerator}/${solution.denominator}`,
    isValid: true,
  });
  
  return steps;
}

function formatSide(a: number, b: number): string {
  let parts: string[] = [];
  if (a !== 0) {
    if (a === 1) parts.push('x');
    else if (a === -1) parts.push('-x');
    else parts.push(`${a}x`);
  }
  if (b !== 0) {
    if (parts.length === 0) parts.push(`${b}`);
    else if (b > 0) parts.push(`+ ${b}`);
    else parts.push(`- ${Math.abs(b)}`);
  }
  if (parts.length === 0) return '0';
  return parts.join(' ');
}

export { formatSide };

export interface QuickAction {
  type: Operation;
  value: number;
  isVariable?: boolean;
  label: string;
  badge: string;
  description: string;
}

export function getRecommendedOperations(eq: Equation): QuickAction[] {
  const actions: QuickAction[] = [];

  const isIsolatedLeft = eq.leftA === 1 && eq.leftB === 0 && eq.rightA === 0;
  const isIsolatedRight = eq.rightA === 1 && eq.rightB === 0 && eq.leftA === 0;
  if (isIsolatedLeft || isIsolatedRight) {
    return [];
  }

  // 1. Her iki tarafta x varsa: sağdaki x'i (veya küçük olanı) yok et
  if (eq.leftA !== 0 && eq.rightA !== 0) {
    if (eq.rightA > 0) {
      actions.push({
        type: 'subtract',
        value: eq.rightA,
        isVariable: true,
        badge: `−${eq.rightA === 1 ? 'x' : `${eq.rightA}x`}`,
        label: `Sağdaki ${eq.rightA === 1 ? 'x' : `${eq.rightA}x`}'i kaldır`,
        description: `Her iki kefeden ${eq.rightA === 1 ? '1x' : `${eq.rightA}x`} eksilt`,
      });
    } else if (eq.rightA < 0) {
      actions.push({
        type: 'add',
        value: Math.abs(eq.rightA),
        isVariable: true,
        badge: `+${Math.abs(eq.rightA) === 1 ? 'x' : `${Math.abs(eq.rightA)}x`}`,
        label: `Sağdaki ${eq.rightA}x'i sıfırla`,
        description: `Her iki kefeye ${Math.abs(eq.rightA) === 1 ? '1x' : `${Math.abs(eq.rightA)}x`} ekle`,
      });
    }
  }

  // 2. x'li taraftaki sabit sayıları temizle
  if (eq.leftB !== 0 && (eq.leftA !== 0 || eq.rightA === 0)) {
    if (eq.leftB > 0) {
      actions.push({
        type: 'subtract',
        value: eq.leftB,
        isVariable: false,
        badge: `−${eq.leftB}`,
        label: `Soldaki +${eq.leftB}'i temizle`,
        description: `Her iki kefeden ${eq.leftB} çıkar`,
      });
    } else {
      actions.push({
        type: 'add',
        value: Math.abs(eq.leftB),
        isVariable: false,
        badge: `+${Math.abs(eq.leftB)}`,
        label: `Soldaki ${eq.leftB}'i sıfırla`,
        description: `Her iki kefeye ${Math.abs(eq.leftB)} ekle`,
      });
    }
  }

  if (eq.leftA === 0 && eq.rightA !== 0 && eq.rightB !== 0) {
    if (eq.rightB > 0) {
      actions.push({
        type: 'subtract',
        value: eq.rightB,
        isVariable: false,
        badge: `−${eq.rightB}`,
        label: `Sağdaki +${eq.rightB}'i temizle`,
        description: `Her iki kefeden ${eq.rightB} çıkar`,
      });
    } else {
      actions.push({
        type: 'add',
        value: Math.abs(eq.rightB),
        isVariable: false,
        badge: `+${Math.abs(eq.rightB)}`,
        label: `Sağdaki ${eq.rightB}'i sıfırla`,
        description: `Her iki kefeye ${Math.abs(eq.rightB)} ekle`,
      });
    }
  }

  // 3. x'in katsayısına böl
  const activeCoeff = eq.leftA !== 0 ? eq.leftA : eq.rightA;
  if (Math.abs(activeCoeff) > 1) {
    actions.push({
      type: 'divide',
      value: Math.abs(activeCoeff),
      isVariable: false,
      badge: `÷${Math.abs(activeCoeff)}`,
      label: `Her iki tarafı ${Math.abs(activeCoeff)}'ye böl`,
      description: `x'in önündeki katsayıyı 1 yap`,
    });
  }

  return actions;
}

export function getEquationStage(eq: Equation): {
  stage: 1 | 2 | 3 | 4;
  progressPercent: number;
  stageName: string;
  nextGoal: string;
  isIsolated: boolean;
  isolatedValue?: number;
} {
  const isIsolatedLeft = eq.leftA === 1 && eq.leftB === 0 && eq.rightA === 0;
  const isIsolatedRight = eq.rightA === 1 && eq.rightB === 0 && eq.leftA === 0;

  if (isIsolatedLeft) {
    return {
      stage: 4,
      progressPercent: 100,
      stageName: "4. Aşama: Çözüm Kümesi Doğrulandı",
      nextGoal: `x = ${eq.rightB} (Terazi Mükemmel Dengede ✓)`,
      isIsolated: true,
      isolatedValue: eq.rightB,
    };
  }

  if (isIsolatedRight) {
    return {
      stage: 4,
      progressPercent: 100,
      stageName: "4. Aşama: Çözüm Kümesi Doğrulandı",
      nextGoal: `x = ${eq.leftB} (Terazi Mükemmel Dengede ✓)`,
      isIsolated: true,
      isolatedValue: eq.leftB,
    };
  }

  if (eq.leftA !== 0 && eq.rightA !== 0) {
    return {
      stage: 1,
      progressPercent: 25,
      stageName: "1. Aşama: Modelin Kurulması & Eşitleme",
      nextGoal: "Eşitliğin korunumu ilkesiyle her iki kefeden eşit sayıda x çıkararak değişkenleri tek tarafta topla.",
      isIsolated: false,
    };
  }

  const varOnLeft = eq.leftA !== 0;
  if ((varOnLeft && eq.leftB !== 0) || (!varOnLeft && eq.rightB !== 0)) {
    return {
      stage: 2,
      progressPercent: 60,
      stageName: "2. Aşama: Bilinmeyenin İzolasyonu",
      nextGoal: "Bilinmeyenin yanındaki sabit terimleri her iki kefeye aynı işlemi uygulayarak nötrle.",
      isIsolated: false,
    };
  }

  const coeff = varOnLeft ? eq.leftA : eq.rightA;
  if (coeff !== 1) {
    return {
      stage: 3,
      progressPercent: 85,
      stageName: "3. Aşama: Çözüm Kümesinin Elde Edilmesi",
      nextGoal: `Her iki kefeyi katsayıya (${coeff}) bölerek 1 adet x blokunu elde et: x = ?`,
      isIsolated: false,
    };
  }

  return {
    stage: 4,
    progressPercent: 100,
    stageName: "4. Aşama: Çözüm Kümesi Doğrulandı",
    nextGoal: `x = ${varOnLeft ? eq.rightB : eq.leftB} (Denge Sağlandı ✓)`,
    isIsolated: true,
    isolatedValue: varOnLeft ? eq.rightB : eq.leftB,
  };
}

/** 3 Aşamalı Kademeli İpucu Sistemi */
export interface ProgressiveHint {
  level: 1 | 2 | 3;
  levelTitle: string;
  question: string;     // 1. Aşama: Düşündürücü Soru
  visualCue: string;    // 2. Aşama: Görsel Yönlendirme
  actionStep: string;   // 3. Aşama: Adım Adım Çözüm Desteği
  recommendedAction?: QuickAction;
}

export function getProgressiveHints(eq: Equation, hintLevel: number = 1): ProgressiveHint {
  const ops = getRecommendedOperations(eq);
  const topOp = ops[0];
  const stage = getEquationStage(eq);

  const levelClamped = Math.min(3, Math.max(1, hintLevel)) as 1 | 2 | 3;
  const levelTitle =
    levelClamped === 1
      ? '1. Aşama: Düşündürücü Soru'
      : levelClamped === 2
      ? '2. Aşama: Görsel Yönlendirme'
      : '3. Aşama: Adım Adım Çözüm';

  if (stage.isIsolated && stage.isolatedValue !== undefined) {
    return {
      level: levelClamped,
      levelTitle,
      question: `x kutusu tek başına kaldı! Karşı kefedeki toplam ağırlık kaç birim?`,
      visualCue: `Karşı kefedeki sayı doğrudan x'in değeridir: x = ${stage.isolatedValue}.`,
      actionStep: `Sonucu onayla veya cevaba ${stage.isolatedValue} yazıp doğrula.`,
      recommendedAction: undefined,
    };
  }

  if (!topOp) {
    return {
      level: levelClamped,
      levelTitle,
      question: `Teraziye baktığında hangi kefenin daha sadeleşebileceğini düşünüyorsun?`,
      visualCue: `Amacımız bir kefede tek bir x kutusu, diğerinde sadece sayı bırakmak.`,
      actionStep: `Denklemi sadeleştirmek için her iki kefeden aynı nesneleri çıkar.`,
      recommendedAction: undefined,
    };
  }

  // 1. Her iki tarafta da x varsa
  if (topOp.isVariable) {
    return {
      level: levelClamped,
      levelTitle,
      question: `Her iki kefede de x kutusu var. Terazi dengesini bozmadan x'leri tek bir kefede nasıl toplayabilirsin?`,
      visualCue: `Sağ tarafta daha az sayıda x varsa, her iki kefeden de bu kadar x kutusu kaldırmayı dene!`,
      actionStep: `İki kefeden de ${topOp.value === 1 ? '1 adet x kutusu' : `${topOp.value} adet x kutusu`} eksilt.`,
      recommendedAction: topOp,
    };
  }

  // 2. x'in yanındaki sabit sayılar
  if (topOp.type === 'subtract' || topOp.type === 'add') {
    const isSub = topOp.type === 'subtract';
    return {
      level: levelClamped,
      levelTitle,
      question: `Bilinmeyen x'in yanında duran sayı bloklarını diğer tarafa geçirmeden nasıl nötrleyebilirsin?`,
      visualCue: `Bir kefedeki +${topOp.value} ağırlığını yok etmek için terazinin iki tarafına da zıt işlem uygulamalısın.`,
      actionStep: `Her iki kefeden ${isSub ? `${topOp.value} birim ağırlık çıkar` : `${topOp.value} birim ağırlık ekle`}.`,
      recommendedAction: topOp,
    };
  }

  // 3. x'in katsayısı
  if (topOp.type === 'divide') {
    return {
      level: levelClamped,
      levelTitle,
      question: `Kefede birden çok x kutusu var. 1 tane x'in ağırlığını bulmak için terazideki blokları nasıl paylaştırırsın?`,
      visualCue: `Her iki kefedeki ağırlıkları x sayısına (${topOp.value}) bölerek eşit gruplara ayır.`,
      actionStep: `Her iki kefedeki miktarı ${topOp.value}'ye böl: ÷${topOp.value}.`,
      recommendedAction: topOp,
    };
  }

  return {
    level: levelClamped,
    levelTitle,
    question: `Dengeyi sağlamak ve x'i yalnız bırakmak için ters işlem düşün.`,
    visualCue: `Denklemin iki tarafına da aynı işlemi yapmayı unutma.`,
    actionStep: `${topOp.label} işlemini uygula.`,
    recommendedAction: topOp,
  };
}

/** Serbest Terazi İçin Matematiksel İfade ve Eşitlik Tespiti */
export interface FreeScaleItem {
  id: string;
  type: 'x' | 'constant';
  value: number; // constant için kütle, x için 1 (katsayı)
  label: string;
}

export function evaluateFreeScale(
  leftItems: FreeScaleItem[],
  rightItems: FreeScaleItem[],
  hiddenXValue: number = 4
): {
  leftMass: number;
  rightMass: number;
  diff: number;
  isBalanced: boolean;
  leftFormula: string;
  rightFormula: string;
  equationDisplay: string;
  discoveredX?: number;
} {
  const leftXCount = leftItems.filter(i => i.type === 'x').length;
  const leftConstTotal = leftItems.filter(i => i.type === 'constant').reduce((s, i) => s + i.value, 0);

  const rightXCount = rightItems.filter(i => i.type === 'x').length;
  const rightConstTotal = rightItems.filter(i => i.type === 'constant').reduce((s, i) => s + i.value, 0);

  const leftMass = leftXCount * hiddenXValue + leftConstTotal;
  const rightMass = rightXCount * hiddenXValue + rightConstTotal;
  const diff = leftMass - rightMass;
  const isBalanced = leftMass === rightMass && (leftItems.length > 0 || rightItems.length > 0);

  // Formül gösterimleri
  const formatItems = (xCount: number, constTotal: number, items: FreeScaleItem[]): string => {
    if (items.length === 0) return '0';
    const parts: string[] = [];
    if (xCount > 0) {
      parts.push(xCount === 1 ? 'x' : `${xCount}x`);
    }
    // Tek tek ağırlıkları listele veya toplamı göster
    const consts = items.filter(i => i.type === 'constant');
    if (consts.length > 0) {
      parts.push(consts.map(c => `${c.value}`).join(' + '));
    }
    return parts.join(' + ');
  };

  const leftFormula = formatItems(leftXCount, leftConstTotal, leftItems);
  const rightFormula = formatItems(rightXCount, rightConstTotal, rightItems);

  let equationDisplay = `${leftFormula} ${isBalanced ? '=' : diff > 0 ? '>' : '<'} ${rightFormula}`;

  // Eğer dengede ve x tek tarafta yalnız veya çözülebilir durumdaysa
  let discoveredX: number | undefined;
  if (isBalanced) {
    if (leftXCount === 1 && rightXCount === 0 && leftConstTotal === 0) {
      discoveredX = rightConstTotal;
    } else if (rightXCount === 1 && leftXCount === 0 && rightConstTotal === 0) {
      discoveredX = leftConstTotal;
    } else if (leftXCount !== rightXCount) {
      const netX = leftXCount - rightXCount;
      const netConst = rightConstTotal - leftConstTotal;
      if (netConst % netX === 0) {
        discoveredX = netConst / netX;
      }
    }
  }

  return {
    leftMass,
    rightMass,
    diff,
    isBalanced,
    leftFormula,
    rightFormula,
    equationDisplay,
    discoveredX,
  };
}

