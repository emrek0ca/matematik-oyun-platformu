/**
 * Kesir Atölyesi - Matematik Motoru
 * Tam sayı aritmetiği ile kesir işlemleri
 * Kayan nokta hatalarından bağımsız kesin hesaplama
 */

export interface Fraction {
  numerator: number;    // Pay
  denominator: number;  // Payda
}

/** En Büyük Ortak Bölen */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  if (b === 0) return a === 0 ? 1 : a;
  return gcd(b, a % b);
}

/** En Küçük Ortak Kat */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** Kesir sadeleştirme */
export function simplify(f: Fraction): Fraction {
  if (f.denominator === 0) throw new Error('Payda sıfır olamaz');
  if (f.numerator === 0) return { numerator: 0, denominator: 1 };
  
  const sign = (f.numerator < 0) !== (f.denominator < 0) ? -1 : 1;
  const absNum = Math.abs(f.numerator);
  const absDen = Math.abs(f.denominator);
  const common = gcd(absNum, absDen);
  
  return {
    numerator: sign * (absNum / common),
    denominator: absDen / common,
  };
}

/** Kesir oluştur (otomatik sadeleştirme) */
export function fraction(num: number, den: number): Fraction {
  if (den === 0) throw new Error('Payda sıfır olamaz');
  return simplify({ numerator: num, denominator: den });
}

/** Kesir toplama: a/b + c/d = (ad + bc) / bd */
export function add(a: Fraction, b: Fraction): Fraction {
  const num = a.numerator * b.denominator + b.numerator * a.denominator;
  const den = a.denominator * b.denominator;
  return simplify({ numerator: num, denominator: den });
}

/** Kesir çıkarma: a/b - c/d = (ad - bc) / bd */
export function subtract(a: Fraction, b: Fraction): Fraction {
  const num = a.numerator * b.denominator - b.numerator * a.denominator;
  const den = a.denominator * b.denominator;
  return simplify({ numerator: num, denominator: den });
}

/** Kesir çarpma: a/b × c/d = ac/bd */
export function multiply(a: Fraction, b: Fraction): Fraction {
  return simplify({
    numerator: a.numerator * b.numerator,
    denominator: a.denominator * b.denominator,
  });
}

/** Kesir bölme: a/b ÷ c/d = ad/bc */
export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.numerator === 0) throw new Error('Sıfıra bölme tanımsız');
  return simplify({
    numerator: a.numerator * b.denominator,
    denominator: a.denominator * b.numerator,
  });
}

/** Kesir karşılaştırma (kayan nokta YOK - çarpraz çarpım) */
export function compare(a: Fraction, b: Fraction): -1 | 0 | 1 {
  // a/b vs c/d → ad vs bc
  const left = a.numerator * b.denominator;
  const right = b.numerator * a.denominator;
  
  // İşaretleri hesaba kat
  const leftSign = a.denominator > 0 ? 1 : -1;
  const rightSign = b.denominator > 0 ? 1 : -1;
  
  const adjustedLeft = left * leftSign;
  const adjustedRight = right * rightSign;
  
  if (adjustedLeft < adjustedRight) return -1;
  if (adjustedLeft > adjustedRight) return 1;
  return 0;
}

/** İki kesrin eşit olup olmadığı */
export function areEqual(a: Fraction, b: Fraction): boolean {
  const sa = simplify(a);
  const sb = simplify(b);
  return sa.numerator === sb.numerator && sa.denominator === sb.denominator;
}

/** Sayı doğrusunda konumu hesapla [0, 1] arasında */
export function toDecimal(f: Fraction): number {
  return f.numerator / f.denominator;
}

/** Kesri string olarak göster */
export function fractionToString(f: Fraction): string {
  const s = simplify(f);
  if (s.denominator === 1) return `${s.numerator}`;
  return `${s.numerator}/${s.denominator}`;
}

/** Ondalık sayıyı kesre dönüştür */
export function fromDecimal(decimal: number, maxDen: number = 100): Fraction {
  // Kesir yaklaşımı (sürekli kesir yöntemi)
  let bestNum = 0, bestDen = 1;
  let minError = Math.abs(decimal);
  
  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(decimal * den);
    const error = Math.abs(decimal - num / den);
    if (error < minError) {
      minError = error;
      bestNum = num;
      bestDen = den;
    }
    if (error < 1e-10) break;
  }
  
  return fraction(bestNum, bestDen);
}

/** Eşdeğer kesirler üret */
export function generateEquivalentFractions(f: Fraction, count: number = 4): Fraction[] {
  const simplified = simplify(f);
  const results: Fraction[] = [simplified];
  
  for (let i = 2; results.length < count; i++) {
    results.push({
      numerator: simplified.numerator * i,
      denominator: simplified.denominator * i,
    });
  }
  
  return results;
}

/** Sayı doğrusunda verilen pozisyonun kesre yakınlığı */
export function getClosestFraction(position: number, candidates: Fraction[]): Fraction {
  let closest = candidates[0];
  let minDiff = Math.abs(toDecimal(candidates[0]) - position);
  
  for (const f of candidates) {
    const diff = Math.abs(toDecimal(f) - position);
    if (diff < minDiff) {
      minDiff = diff;
      closest = f;
    }
  }
  
  return closest;
}

/** Zorluk seviyesine göre kesir üret */
export function generateFraction(difficulty: 'kolay' | 'orta' | 'zor'): Fraction {
  const rand = (min: number, max: number) => 
    Math.floor(Math.random() * (max - min + 1)) + min;
  
  switch (difficulty) {
    case 'kolay':
      // Basit paydalı: 2, 3, 4
      {
        const den = [2, 3, 4][rand(0, 2)];
        const num = rand(1, den - 1);
        return fraction(num, den);
      }
    case 'orta':
      // Orta paydalı: 4, 5, 6, 8, 10
      {
        const dens = [4, 5, 6, 8, 10];
        const den = dens[rand(0, dens.length - 1)];
        const num = rand(1, den - 1);
        return fraction(num, den);
      }
    case 'zor':
      // Zor paydalı: 6, 8, 9, 10, 12
      {
        const dens = [6, 8, 9, 10, 12];
        const den = dens[rand(0, dens.length - 1)];
        const num = rand(1, den - 1);
        return fraction(num, den);
      }
  }
}

/** Kesir dairesel parçaların açısal koordinatlarını hesapla */
export interface PieSlice {
  startAngle: number;  // radyan
  endAngle: number;    // radyan
  label: string;
}

export function computePieSlices(f: Fraction): PieSlice[] {
  const s = simplify(f);
  const slices: PieSlice[] = [];
  const anglePerPart = (2 * Math.PI) / s.denominator;
  
  // Dolu parçalar
  for (let i = 0; i < s.numerator; i++) {
    slices.push({
      startAngle: i * anglePerPart - Math.PI / 2,
      endAngle: (i + 1) * anglePerPart - Math.PI / 2,
      label: 'filled',
    });
  }
  
  // Boş parçalar
  for (let i = s.numerator; i < s.denominator; i++) {
    slices.push({
      startAngle: i * anglePerPart - Math.PI / 2,
      endAngle: (i + 1) * anglePerPart - Math.PI / 2,
      label: 'empty',
    });
  }
  
  return slices;
}

/** Kesir çubuğu genişlik oranı [0, 1] */
export function barWidth(f: Fraction): number {
  return Math.max(0, Math.min(1, f.numerator / f.denominator));
}

/** Verilen kesri sadeleştirerek öğrenciye açıkla */
export function explainSimplification(f: Fraction): string {
  const s = simplify(f);
  const common = gcd(Math.abs(f.numerator), Math.abs(f.denominator));
  
  if (common === 1) {
    return `${fractionToString(f)} zaten tam olarak sadeleştirilmiş.`;
  }
  
  return `${fractionToString(f)} → pay ve paydayı ${common}'ye böl → ${fractionToString(s)}`;
}

/** Karşılaştırma açıklaması */
export function explainComparison(a: Fraction, b: Fraction): string {
  const result = compare(a, b);
  const sa = simplify(a);
  const sb = simplify(b);
  
  // Ortak paydaya getir
  const commonDen = lcm(sa.denominator, sb.denominator);
  const aNum = sa.numerator * (commonDen / sa.denominator);
  const bNum = sb.numerator * (commonDen / sb.denominator);
  
  const symbol = result === -1 ? '<' : result === 1 ? '>' : '=';
  const verb = result === -1 ? 'küçüktür' : result === 1 ? 'büyüktür' : 'eşittir';
  
  return `Ortak payda ${commonDen}: ${fractionToString(a)} = ${aNum}/${commonDen}, ` +
    `${fractionToString(b)} = ${bNum}/${commonDen}. ` +
    `${aNum} ${symbol} ${bNum} olduğundan ${fractionToString(a)} ${verb} ${fractionToString(b)}`;
}

/** Sayı doğrusu gösterimi için işaret noktaları (0'dan 2'ye) */
export function getNumberLineMarkers(fractions: Fraction[]): Array<{
  fraction: Fraction;
  position: number;
  label: string;
}> {
  return fractions.map(f => ({
    fraction: f,
    position: toDecimal(f),
    label: fractionToString(f),
  }));
}

/** PIZZA ŞEFİ RUSH: Modeller ve Yardımcılar */
export interface RequiredIngredient {
  name: string;
  fraction: Fraction;
  color: string;
  icon: string;
}

export interface PizzaSliceOption {
  id: string;
  fraction: Fraction;
  color: string;
  name: string;
  icon: string;
  isSolution?: boolean;
}

export interface PizzaOrderChallenge {
  id: string;
  target: Fraction;
  requiredIngredients: RequiredIngredient[];
  customerName: string;
  customerAvatar: string;
  dialogue: string;
  orderTag: string;
  timeLimit: number;
  availableSlices: PizzaSliceOption[];
  hint: string;
}

export const INGREDIENTS = [
  { name: 'Köz Biberli', color: '#f97316', icon: '🌶️' },
  { name: 'Kaşarlı Peynir', color: '#f59e0b', icon: '🧀' },
  { name: 'Sucuklu Dilim', color: '#ef4444', icon: '🍕' },
  { name: 'Fesleğenli Dilim', color: '#10b981', icon: '🌿' },
  { name: 'Mantarlı Dilim', color: '#06b6d4', icon: '🍄' },
  { name: 'Siyah Zeytinli', color: '#8b5cf6', icon: '🫒' },
  { name: 'Dana Füme', color: '#be123c', icon: '🥓' },
  { name: 'Mısırlı Cheddar', color: '#eab308', icon: '🌽' },
  { name: 'Karamelize Soğan', color: '#a855f7', icon: '🧅' },
  { name: 'Kurutulmuş Domates', color: '#f43f5e', icon: '🍅' },
  { name: 'Pesto Soslu', color: '#059669', icon: '🌱' },
  { name: 'Tulum Peynirli', color: '#d97706', icon: '🫕' },
];

const CUSTOMERS = [
  { name: 'Şef Mario', avatar: '👨‍🍳' },
  { name: 'Aç Mühendis', avatar: '🧑‍💻' },
  { name: 'Öğrenci Deniz', avatar: '🎒' },
  { name: 'Prof. Gauss', avatar: '🧙‍♂️' },
  { name: 'Astronot Neil', avatar: '🚀' },
  { name: 'Gurme Kedi', avatar: '🐱' },
  { name: 'Robot Pi-314', avatar: '🤖' },
  { name: 'Dedektif Sherlock', avatar: '🕵️' },
  { name: 'Bayan Simitçi', avatar: '🥨' },
  { name: 'Sporcu Efe', avatar: '🏃' },
  { name: 'Mimar Sinan', avatar: '📐' },
  { name: 'Gamer Can', avatar: '🎮' },
  { name: 'Gece Nöbetçisi', avatar: '🌙' },
  { name: 'Doktor Aylin', avatar: '👩‍⚕️' },
  { name: 'Sanatçı Leyla', avatar: '🎨' },
];

let lastTargetString = '';

export function generatePizzaChallenge(difficulty: 'kolay' | 'orta' | 'zor'): PizzaOrderChallenge {
  const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  let target: Fraction = fraction(1, 1);
  let solutionSlices: Fraction[] = [];
  let timeLimit = 40;
  let orderTag = '🎯 Standart Sipariş';

  // Kolay Mod: Sadece anlaşılır yarım ve çeyrekler (1/2, 1/4)
  const poolKolay: Fraction[] = [
    fraction(1, 2), fraction(1, 4), fraction(1, 4), fraction(1, 2)
  ];
  // Orta Mod: 2, 3, 4, 6, 8 paydaları
  const poolOrta: Fraction[] = [
    fraction(1, 2), fraction(1, 3), fraction(1, 4), fraction(1, 6),
    fraction(1, 8), fraction(3, 8), fraction(2, 3), fraction(3, 4)
  ];
  // Zor Mod: Gelişmiş kesirler
  const poolZor: Fraction[] = [
    fraction(1, 2), fraction(1, 3), fraction(1, 4), fraction(1, 5),
    fraction(1, 6), fraction(1, 8), fraction(1, 10), fraction(1, 12),
    fraction(2, 3), fraction(2, 5), fraction(3, 8), fraction(5, 12)
  ];

  const pool = difficulty === 'kolay' ? poolKolay : difficulty === 'orta' ? poolOrta : poolZor;
  timeLimit = difficulty === 'kolay' ? 50 : difficulty === 'orta' ? 40 : 30;

  // Çözülebilir hedef ve parçaları rastgele sentezle
  for (let attempt = 0; attempt < 30; attempt++) {
    const numParts = (difficulty === 'zor' && Math.random() > 0.6) ? 3 : 2;
    const parts: Fraction[] = [];
    let currentSum = fraction(0, 1);
    let valid = true;

    for (let p = 0; p < numParts; p++) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      const nextSum = add(currentSum, candidate);
      if (nextSum.numerator > nextSum.denominator) {
        valid = false;
        break;
      }
      parts.push(candidate);
      currentSum = nextSum;
    }

    if (valid && parts.length === numParts && currentSum.numerator > 0) {
      const tStr = fractionToString(currentSum);
      if (tStr !== lastTargetString || attempt > 15) {
        target = currentSum;
        solutionSlices = parts;
        lastTargetString = tStr;
        break;
      }
    }
  }

  // Güvenli varsayılan
  if (solutionSlices.length === 0) {
    solutionSlices = [fraction(1, 2), fraction(1, 4)];
    target = fraction(3, 4);
    lastTargetString = '3/4';
  }

  // Sipariş Etiketi
  if (target.numerator === target.denominator) {
    orderTag = '👑 1 Bütün Pizza';
  } else if (solutionSlices.length >= 3) {
    orderTag = '🔥 3 Dilimli Menü';
  } else if (target.denominator >= 8) {
    orderTag = '⚡ Çıtır Dilim Görevi';
  } else {
    orderTag = '🎯 Standart Sipariş';
  }

  // Yanıltıcı dilimler seç
  const distractorSlices: Fraction[] = [];
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  for (const f of shuffledPool) {
    if (distractorSlices.length >= (6 - solutionSlices.length)) break;
    distractorSlices.push(f);
  }

  // Malzemeleri ata (Örn: Köz Biberli, Kaşarlı, Sucuklu...)
  const shuffledIngredients = [...INGREDIENTS].sort(() => Math.random() - 0.5);

  const requiredIngredients: RequiredIngredient[] = solutionSlices.map((f, i) => {
    const ing = shuffledIngredients[i % shuffledIngredients.length];
    return {
      name: ing.name,
      fraction: f,
      color: ing.color,
      icon: ing.icon,
    };
  });

  const solutionItems = requiredIngredients.map(req => ({
    fraction: req.fraction,
    name: req.name,
    color: req.color,
    icon: req.icon,
    isSolution: true,
  }));

  const distractorIngredients = shuffledIngredients.slice(solutionSlices.length);
  const distractorItems = distractorSlices.map((f, i) => {
    const ing = distractorIngredients[i % distractorIngredients.length] || INGREDIENTS[(i + 4) % INGREDIENTS.length];
    return {
      fraction: f,
      name: ing.name,
      color: ing.color,
      icon: ing.icon,
      isSolution: false,
    };
  });

  const allSlices: PizzaSliceOption[] = [...solutionItems, ...distractorItems]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map((item, i) => ({
      id: `slice-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      fraction: item.fraction,
      color: item.color,
      name: item.name,
      icon: item.icon,
      isSolution: item.isSolution,
    }));

  const recipeText = requiredIngredients
    .map(r => `${fractionToString(r.fraction)} ${r.name}`)
    .join(' ve ');

  const dialogue = `Bana tam ${recipeText} pizza hazırla!`;
  const hint = `💡 Şef Tüyosu: Müşteri ${recipeText} istedi. Tezgahtaki bu malzemeli dilimleri seç!`;

  return {
    id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    target,
    requiredIngredients,
    customerName: customer.name,
    customerAvatar: customer.avatar,
    dialogue,
    orderTag,
    timeLimit,
    availableSlices: allSlices,
    hint,
  };
}

/** Model Türü */
export type FractionModelType = 'circle' | 'strip' | 'grid' | 'numberline';

/** Tam sayılı kesir temsili */
export interface MixedFraction {
  whole: number;
  remainder: Fraction;
}

/** Bileşik kesri tam sayılı kesre dönüştür */
export function toMixedFraction(f: Fraction): MixedFraction {
  if (f.denominator === 0) throw new Error('Payda sıfır olamaz');
  const whole = Math.floor(Math.abs(f.numerator) / Math.abs(f.denominator));
  const remNum = Math.abs(f.numerator) % Math.abs(f.denominator);
  return {
    whole: (f.numerator < 0 !== f.denominator < 0) && whole > 0 ? -whole : whole,
    remainder: {
      numerator: remNum,
      denominator: Math.abs(f.denominator),
    },
  };
}

/** Tam sayılı kesirden bileşik kesir oluştur */
export function fromMixedFraction(whole: number, remainder: Fraction): Fraction {
  const sign = whole < 0 ? -1 : 1;
  const absWhole = Math.abs(whole);
  const num = sign * (absWhole * remainder.denominator + remainder.numerator);
  return simplify({ numerator: num, denominator: remainder.denominator });
}

/** Kesir genişletme simülasyonu: pay ve paydayı k ile çarp */
export function expandFraction(f: Fraction, factor: number): {
  original: Fraction;
  factor: number;
  expanded: Fraction;
} {
  if (factor <= 0) throw new Error('Genişletme çarpanı pozitif tam sayı olmalıdır');
  return {
    original: f,
    factor,
    expanded: {
      numerator: f.numerator * factor,
      denominator: f.denominator * factor,
    },
  };
}

/** Ortak Paydaya Getirme ve Adım Adım İşlem İspatı */
export interface CommonDenominatorStep {
  commonDen: number;
  aFactor: number;
  bFactor: number;
  expandedA: Fraction;
  expandedB: Fraction;
  result: Fraction;
  simplifiedResult: Fraction;
  steps: string[];
}

export function getCommonDenominatorSteps(
  a: Fraction,
  b: Fraction,
  op: 'add' | 'subtract'
): CommonDenominatorStep {
  const commonDen = lcm(a.denominator, b.denominator);
  const aFactor = commonDen / a.denominator;
  const bFactor = commonDen / b.denominator;

  const expandedA: Fraction = {
    numerator: a.numerator * aFactor,
    denominator: commonDen,
  };
  const expandedB: Fraction = {
    numerator: b.numerator * bFactor,
    denominator: commonDen,
  };

  const rawResultNum = op === 'add'
    ? expandedA.numerator + expandedB.numerator
    : expandedA.numerator - expandedB.numerator;

  const result: Fraction = {
    numerator: rawResultNum,
    denominator: commonDen,
  };

  const simplifiedResult = simplify(result);

  const opSymbol = op === 'add' ? '+' : '−';
  const opVerb = op === 'add' ? 'toplandı' : 'çıkarıldı';

  const steps: string[] = [
    `1. Aşama (Paydaları İnceleme): Kesirlerin paydaları ${a.denominator} ve ${b.denominator}. Farklı boyutta oldukları için doğrudan ${opVerb} yapılamaz.`,
    `2. Aşama (Ortak Payda Bulma): EKOK(${a.denominator}, ${b.denominator}) = ${commonDen}. Her iki model de ${commonDen}'lik eş parçalara genişletilir.`,
    `3. Aşama (Genişletme): ${fractionToString(a)} kesri ${aFactor} ile genişletilerek ${expandedA.numerator}/${commonDen} olur. ${fractionToString(b)} kesri ${bFactor} ile genişletilerek ${expandedB.numerator}/${commonDen} olur.`,
    `4. Aşama (Eş Parçalarla İşlem): Artık tüm parçalar 1/${commonDen} boyutundadır! ${expandedA.numerator}/${commonDen} ${opSymbol} ${expandedB.numerator}/${commonDen} = ${rawResultNum}/${commonDen}.`,
  ];

  if (simplifiedResult.numerator !== result.numerator || simplifiedResult.denominator !== result.denominator) {
    steps.push(`5. Aşama (Sadeleştirme): ${rawResultNum}/${commonDen} sadeleştirilerek ${fractionToString(simplifiedResult)} sonucuna ulaşılır.`);
  }

  return {
    commonDen,
    aFactor,
    bFactor,
    expandedA,
    expandedB,
    result,
    simplifiedResult,
    steps,
  };
}

/** Izgara boyutları (satır x sütun) */
export function getGridDimensions(denominator: number): { rows: number; cols: number } {
  switch (denominator) {
    case 1: return { rows: 1, cols: 1 };
    case 2: return { rows: 1, cols: 2 };
    case 3: return { rows: 1, cols: 3 };
    case 4: return { rows: 2, cols: 2 };
    case 5: return { rows: 1, cols: 5 };
    case 6: return { rows: 2, cols: 3 };
    case 7: return { rows: 1, cols: 7 };
    case 8: return { rows: 2, cols: 4 };
    case 9: return { rows: 3, cols: 3 };
    case 10: return { rows: 2, cols: 5 };
    case 12: return { rows: 3, cols: 4 };
    case 14: return { rows: 2, cols: 7 };
    case 15: return { rows: 3, cols: 5 };
    case 16: return { rows: 4, cols: 4 };
    default:
      return denominator % 2 === 0
        ? { rows: 2, cols: Math.floor(denominator / 2) }
        : { rows: 1, cols: denominator };
  }
}


