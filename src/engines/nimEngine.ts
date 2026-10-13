/**
 * NIM Oyunu - Matematik Motoru
 * XOR tabanlı optimal strateji hesaplama
 * Klasik NIM oyunu: birden fazla yığın, son nesneyi alan kazanır (normal oyun)
 */

export interface NimState {
  heaps: number[];       // Yığın büyüklükleri
  currentPlayer: 0 | 1; // 0: insan, 1: bilgisayar
  moveHistory: NimMove[];
  isGameOver: boolean;
  winner?: 0 | 1;
  winCondition?: string;
}

export interface NimMove {
  player: 0 | 1;
  heapIndex: number;
  objectsRemoved: number;
  heapBefore: number;
  heapAfter: number;
  nimSum: number; // Bu hamleden SONRA nim toplamı
}

/** NIM toplamını hesapla (XOR) */
export function calculateNimSum(heaps: number[]): number {
  return heaps.reduce((acc, heap) => acc ^ heap, 0);
}

/** Oyun bitti mi? */
export function isGameOver(heaps: number[]): boolean {
  return heaps.every(h => h === 0);
}

/** Geçerli hamle mi? */
export function isValidMove(heaps: number[], heapIndex: number, objectsToRemove: number): boolean {
  if (heapIndex < 0 || heapIndex >= heaps.length) return false;
  if (objectsToRemove <= 0) return false;
  if (objectsToRemove > heaps[heapIndex]) return false;
  return true;
}

/** Hamle yap */
export function makeMove(
  state: NimState,
  heapIndex: number,
  objectsToRemove: number,
  isMisere: boolean = false
): { success: boolean; newState?: NimState; error?: string } {
  if (state.isGameOver) {
    return { success: false, error: 'Oyun zaten bitti' };
  }
  
  if (!isValidMove(state.heaps, heapIndex, objectsToRemove)) {
    if (objectsToRemove <= 0) {
      return { success: false, error: 'En az bir nesne almanız gerekiyor.' };
    }
    if (objectsToRemove > state.heaps[heapIndex]) {
      return { success: false, error: `Bu yığında sadece ${state.heaps[heapIndex]} nesne var.` };
    }
    return { success: false, error: 'Geçersiz hamle.' };
  }
  
  const newHeaps = [...state.heaps];
  const heapBefore = newHeaps[heapIndex];
  newHeaps[heapIndex] -= objectsToRemove;
  const heapAfter = newHeaps[heapIndex];
  
  const newNimSum = calculateNimSum(newHeaps);
  const gameOver = isGameOver(newHeaps);
  
  // Normal oyun: son nesneyi alan kazanır.
  // Misère oyun: son nesneyi alan kaybeder (diğer oyuncu kazanır).
  const winner = gameOver 
    ? (isMisere ? (state.currentPlayer === 0 ? 1 : 0) : state.currentPlayer)
    : undefined;
  
  const move: NimMove = {
    player: state.currentPlayer,
    heapIndex,
    objectsRemoved: objectsToRemove,
    heapBefore,
    heapAfter,
    nimSum: newNimSum,
  };
  
  return {
    success: true,
    newState: {
      heaps: newHeaps,
      currentPlayer: gameOver ? state.currentPlayer : (state.currentPlayer === 0 ? 1 : 0),
      moveHistory: [...state.moveHistory, move],
      isGameOver: gameOver,
      winner,
      winCondition: gameOver 
        ? (isMisere
            ? `Son zehirli taşı alan oyuncu ${state.currentPlayer === 0 ? 'Sen' : 'Bilgisayar'} kaybetti! Kazanan: ${winner === 0 ? 'Sen' : 'Bilgisayar'}!`
            : `Son nesneyi alan oyuncu ${winner === 0 ? 'Sen' : 'Bilgisayar'} kazandı!`)
        : undefined,
    },
  };
}

/** Optimal NIM hamlesi bul (XOR stratejisi) */
export interface OptimalMove {
  heapIndex: number;
  objectsToRemove: number;
  resultingNimSum: number;
  isWinning: boolean;
  explanation: string;
}

export function findOptimalMove(heaps: number[]): OptimalMove | null {
  const nimSum = calculateNimSum(heaps);
  
  if (isGameOver(heaps)) return null;
  
  // Mevcut tüm hamleleri listele
  const allMoves: Array<{ heapIndex: number; remove: number }> = [];
  for (let i = 0; i < heaps.length; i++) {
    for (let r = 1; r <= heaps[i]; r++) {
      allMoves.push({ heapIndex: i, remove: r });
    }
  }
  
  if (nimSum !== 0) {
    // Kazandıran pozisyon: NIM toplamını sıfır yapacak hamle bul
    for (const move of allMoves) {
      const newHeaps = [...heaps];
      newHeaps[move.heapIndex] -= move.remove;
      const newNimSum = calculateNimSum(newHeaps);
      
      if (newNimSum === 0) {
        return {
          heapIndex: move.heapIndex,
          objectsToRemove: move.remove,
          resultingNimSum: 0,
          isWinning: true,
          explanation: `Yığın ${move.heapIndex + 1}'den ${move.remove} nesne alınırsa NIM toplamı sıfır olur ve rakip kaybeden pozisyona düşer.`,
        };
      }
    }
  }
  
  // Kaybeden pozisyon: herhangi bir geçerli hamle
  // Stratejik olarak mümkün olduğunca az nesne al (oyuncuya şans ver)
  const firstMove = allMoves[0];
  const newHeaps = [...heaps];
  newHeaps[firstMove.heapIndex] -= firstMove.remove;
  
  return {
    heapIndex: firstMove.heapIndex,
    objectsToRemove: firstMove.remove,
    resultingNimSum: calculateNimSum(newHeaps),
    isWinning: false,
    explanation: `Mevcut pozisyon kaybettirici. Herhangi bir hamle rakibi kazandıran pozisyona getirir.`,
  };
}

/** Misère NIM için optimal hamle bul (Son taşı alan kaybeder) */
export function findMisereOptimalMove(heaps: number[]): OptimalMove | null {
  if (isGameOver(heaps)) return null;

  const allMoves: Array<{ heapIndex: number; remove: number }> = [];
  for (let i = 0; i < heaps.length; i++) {
    for (let r = 1; r <= heaps[i]; r++) {
      allMoves.push({ heapIndex: i, remove: r });
    }
  }

  // Eğer tüm kalan yığınlar 1 olacak şekilde hamle yapılabiliyorsa,
  // rakibe TEK sayıda 1'lik yığın bırakacak hamleyi seç!
  for (const move of allMoves) {
    const nextHeaps = [...heaps];
    nextHeaps[move.heapIndex] -= move.remove;
    const remaining = nextHeaps.filter(h => h > 0);
    const allOnes = remaining.length > 0 && remaining.every(h => h === 1);
    if (allOnes && remaining.length % 2 === 1) {
      return {
        heapIndex: move.heapIndex,
        objectsToRemove: move.remove,
        resultingNimSum: calculateNimSum(nextHeaps),
        isWinning: true,
        explanation: `Yığın ${move.heapIndex + 1}'den ${move.remove} taş alınarak rakibe tek sayıda 1'lik taş bırakılır. Rakip son zehirli taşı almaya mahkum edilir!`,
      };
    }
  }

  // Henüz 1'den büyük birden çok yığın varsa, standart XOR stratejisi geçerlidir
  return findOptimalMove(heaps);
}

/** Zorluk seviyesine göre bilgisayar hamlesi */
export function computerMove(
  heaps: number[],
  difficulty: 'kolay' | 'orta' | 'zor',
  isMisere: boolean = false
): { heapIndex: number; objectsToRemove: number } {
  const allValidMoves: Array<{ heapIndex: number; remove: number }> = [];
  
  for (let i = 0; i < heaps.length; i++) {
    for (let r = 1; r <= heaps[i]; r++) {
      allValidMoves.push({ heapIndex: i, remove: r });
    }
  }
  
  if (allValidMoves.length === 0) return { heapIndex: 0, objectsToRemove: 0 };
  
  const getBestMove = () => isMisere ? findMisereOptimalMove(heaps) : findOptimalMove(heaps);

  switch (difficulty) {
    case 'kolay': {
      // Tamamen rastgele
      const move = allValidMoves[Math.floor(Math.random() * allValidMoves.length)];
      return { heapIndex: move.heapIndex, objectsToRemove: move.remove };
    }
    
    case 'orta': {
      // %50 optimal, %50 rastgele
      if (Math.random() < 0.5) {
        const optimal = getBestMove();
        if (optimal) return { heapIndex: optimal.heapIndex, objectsToRemove: optimal.objectsToRemove };
      }
      const move = allValidMoves[Math.floor(Math.random() * allValidMoves.length)];
      return { heapIndex: move.heapIndex, objectsToRemove: move.remove };
    }
    
    case 'zor': {
      // Her zaman optimal
      const optimal = getBestMove();
      if (optimal) return { heapIndex: optimal.heapIndex, objectsToRemove: optimal.objectsToRemove };
      // Fallback
      const move = allValidMoves[Math.floor(Math.random() * allValidMoves.length)];
      return { heapIndex: move.heapIndex, objectsToRemove: move.remove };
    }
  }
}

/** Pozisyon analizi */
export interface PositionAnalysis {
  nimSum: number;
  nimSumBinary: string;
  heapsBinary: string[];
  isWinningPosition: boolean;
  optimalMove?: OptimalMove;
  explanation: string;
}

export function analyzePosition(heaps: number[]): PositionAnalysis {
  const nimSum = calculateNimSum(heaps);
  const isWinning = nimSum !== 0;
  
  const heapsBinary = heaps.map(h => h.toString(2).padStart(
    Math.max(4, ...heaps.map(x => x.toString(2).length)),
    '0'
  ));
  
  let explanation: string;
  if (isWinning) {
    const opt = findOptimalMove(heaps);
    explanation = `NIM toplamı ${nimSum} ≠ 0 → Bu kazandıran pozisyon. ` +
      (opt ? `Optimal hamle: Yığın ${opt.heapIndex + 1}'den ${opt.objectsToRemove} nesne al.` : '');
  } else {
    if (isGameOver(heaps)) {
      explanation = 'Oyun bitti.';
    } else {
      explanation = `NIM toplamı ${nimSum} = 0 → Bu kaybettiren pozisyon. ` +
        'Rakip optimal oynarsa bu pozisyonda kaybedersiniz.';
    }
  }
  
  return {
    nimSum,
    nimSumBinary: nimSum.toString(2),
    heapsBinary,
    isWinningPosition: isWinning,
    optimalMove: isWinning ? findOptimalMove(heaps) ?? undefined : undefined,
    explanation,
  };
}

/** Başlangıç durumu oluştur */
export function createInitialState(
  heaps: number[],
  firstPlayer: 0 | 1 = 0
): NimState {
  return {
    heaps: [...heaps],
    currentPlayer: firstPlayer,
    moveHistory: [],
    isGameOver: false,
  };
}

/** Zorluk seviyesine göre başlangıç yığınları */
export function generateHeaps(difficulty: 'kolay' | 'orta' | 'zor'): number[] {
  switch (difficulty) {
    case 'kolay':
      // 2-3 yığın, küçük sayılar
      return [
        Math.floor(Math.random() * 3) + 1,
        Math.floor(Math.random() * 3) + 1,
        Math.floor(Math.random() * 3) + 1,
      ];
      
    case 'orta':
      // 3 yığın, orta sayılar
      return [
        Math.floor(Math.random() * 5) + 2,
        Math.floor(Math.random() * 5) + 2,
        Math.floor(Math.random() * 5) + 2,
      ];
      
    case 'zor':
      // 3-4 yığın, büyük sayılar
      return [
        Math.floor(Math.random() * 7) + 3,
        Math.floor(Math.random() * 7) + 3,
        Math.floor(Math.random() * 7) + 3,
        Math.floor(Math.random() * 4) + 1,
      ];
  }
}

/** İkili gösterim tablosu */
export interface BinaryTable {
  headers: string[];
  rows: Array<{
    label: string;
    bits: string[];
    value: number;
  }>;
  nimSumRow: {
    label: string;
    bits: string[];
    value: number;
  };
}

export function buildBinaryTable(heaps: number[]): BinaryTable {
  const maxBits = Math.max(4, ...heaps.map(h => h.toString(2).length));
  const headers = Array.from({ length: maxBits }, (_, i) => `2^${maxBits - 1 - i}`);
  
  const rows = heaps.map((h, i) => ({
    label: `Yığın ${i + 1}`,
    bits: h.toString(2).padStart(maxBits, '0').split(''),
    value: h,
  }));
  
  const nimSum = calculateNimSum(heaps);
  
  return {
    headers,
    rows,
    nimSumRow: {
      label: 'NIM Toplamı (XOR)',
      bits: nimSum.toString(2).padStart(maxBits, '0').split(''),
      value: nimSum,
    },
  };
}

/** Kazandıran hamle açıklaması */
export function explainWinningMove(heaps: number[]): string {
  const nimSum = calculateNimSum(heaps);
  
  if (nimSum === 0) {
    return 'Bu kaybettiren pozisyon (NIM toplamı = 0). Rakip optimal oynarsa kaybedersiniz.';
  }
  
  const move = findOptimalMove(heaps);
  if (!move) return 'Geçerli hamle yok.';
  
  const newHeaps = [...heaps];
  newHeaps[move.heapIndex] -= move.objectsToRemove;
  
  return `NIM toplamı = ${nimSum} (${nimSum.toString(2)} ikili). ` +
    `Yığın ${move.heapIndex + 1} (${heaps[move.heapIndex]}) XOR ${nimSum} = ` +
    `${(heaps[move.heapIndex] ^ nimSum)} → ${move.objectsToRemove} nesne kaldır. ` +
    `Yeni NIM toplamı = ${calculateNimSum(newHeaps)}.`;
}
