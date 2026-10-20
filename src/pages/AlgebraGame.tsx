import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import BalanceScale3D, { PanItem, decomposeConstantToWeights } from '../components/BalanceScale3D';
import {
  Equation,
  generateEquation,
  solveLinearEquation,
  equationToString,
  generateSolutionSteps,
  validateStudentAnswer,
  formatSide,
  applyOperation,
  getRecommendedOperations,
  getEquationStage,
  getProgressiveHints,
  ProgressiveHint,
  evaluateFreeScale,
  FreeScaleItem,
  QuickAction,
} from '../engines/algebraEngine';

type Difficulty = 'kolay' | 'orta' | 'zor';
type PlayMode = 'free' | 'equation';

interface ConceptStats {
  equalityBalance: number;       // Eşitlik ve Denge
  isolation: number;             // Bilinmeyeni Yalnız Bırakma
  equivalencePrinciple: number;  // Denklemin İki Tarafına Aynı İşlemi Uygulama
  inverseOperations: number;     // Ters İşlemler (Toplama-Çıkarma, vb.)
  multiStepLinear: number;       // Çok Adımlı Doğrusal Çözüm
}

interface ActionHistorySnapshot {
  currentEq: Equation;
  leftItems: PanItem[];
  rightItems: PanItem[];
  steps: string[];
  description: string;
}

export default function AlgebraGame() {
  const { setCurrentGame, recordGameResult, playSound } = useAppStore();

  // Ana Mod Seçimi (Mod A: Serbest Terazi vs Mod B: Denklem Çözme)
  const [playMode, setPlayMode] = useState<PlayMode>('equation');
  const [difficulty, setDifficulty] = useState<Difficulty>('kolay');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // MOD B: Denklem Çözme Durumu
  const [equation, setEquation] = useState<Equation>(() => generateEquation('kolay'));
  const [currentEq, setCurrentEq] = useState<Equation>(equation);
  const [solved, setSolved] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [history, setHistory] = useState<ActionHistorySnapshot[]>([]);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'hint' | 'info'; message: string } | null>(null);

  // MOD A: Serbest Terazi Durumu
  const [freeLeftItems, setFreeLeftItems] = useState<FreeScaleItem[]>([
    { id: 'free-l-1', type: 'constant', value: 3, label: '3' },
    { id: 'free-l-2', type: 'constant', value: 4, label: '4' },
  ]);
  const [freeRightItems, setFreeRightItems] = useState<FreeScaleItem[]>([
    { id: 'free-r-1', type: 'constant', value: 7, label: '7' },
  ]);
  const [freeHiddenX, setFreeHiddenX] = useState<number>(4);

  // 3 Aşamalı İpucu Sistemi & Modallar
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSolutionSteps, setShowSolutionSteps] = useState(false);

  // Sürükle-Bırak Durumu
  const [draggedItem, setDraggedItem] = useState<{ type: 'x' | 'constant'; value: number } | null>(null);
  const [hoveredPan, setHoveredPan] = useState<'left' | 'right' | null>(null);

  // Dinamik Terazi Eğim ve Salınım
  const [isTilting, setIsTilting] = useState(false);
  const [manualTiltAngle, setManualTiltAngle] = useState(0);

  // Öğrenme İlerlemesi & İstatistikler
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    correctAttempts: 0,
    wrongAttempts: 0,
    hintsUsed: 0,
    startTime: Date.now(),
  });
  const [concepts, setConcepts] = useState<ConceptStats>({
    equalityBalance: 0,
    isolation: 0,
    equivalencePrinciple: 0,
    inverseOperations: 0,
    multiStepLinear: 0,
  });

  const tiltTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gerçek x Çözüm Değeri (Sistemde gizli saklanır, fizik hesabında kullanılır)
  const trueSolution = useMemo(() => {
    try {
      const sol = solveLinearEquation(equation);
      return sol.numerator / sol.denominator;
    } catch {
      return 4;
    }
  }, [equation]);

  // Yeni Denklem Başlatma
  const startNewProblem = useCallback((diff: Difficulty = difficulty) => {
    const newEq = generateEquation(diff);
    setEquation(newEq);
    setCurrentEq(newEq);
    setSolved(false);
    setSteps([equationToString(newEq)]);
    setHistory([]);
    setStudentAnswer('');
    setFeedback(null);
    setHintLevel(0);
    setShowSolutionSteps(false);
    setManualTiltAngle(0);
    setIsTilting(false);
    if (tiltTimerRef.current) clearTimeout(tiltTimerRef.current);
  }, [difficulty]);

  useEffect(() => {
    startNewProblem(difficulty);
  }, [difficulty, startNewProblem]);

  // MOD B: Kefelerdeki PanItem Elemanları
  const leftPanItems = useMemo<PanItem[]>(() => {
    const items: PanItem[] = [];
    for (let i = 0; i < Math.max(0, currentEq.leftA); i++) {
      items.push({ id: `l-x-${i}`, type: 'x', value: 1, label: 'x' });
    }
    items.push(...decomposeConstantToWeights(currentEq.leftB, 'left'));
    return items;
  }, [currentEq.leftA, currentEq.leftB]);

  const rightPanItems = useMemo<PanItem[]>(() => {
    const items: PanItem[] = [];
    for (let i = 0; i < Math.max(0, currentEq.rightA); i++) {
      items.push({ id: `r-x-${i}`, type: 'x', value: 1, label: 'x' });
    }
    items.push(...decomposeConstantToWeights(currentEq.rightB, 'right'));
    return items;
  }, [currentEq.rightA, currentEq.rightB]);

  // MOD B Fiziksel Kütleler (Gizli x kütlesi dahil edilerek)
  const currentLeftMass = useMemo(() => {
    return leftPanItems.reduce((acc, it) => acc + (it.type === 'x' ? trueSolution : it.value), 0);
  }, [leftPanItems, trueSolution]);

  const currentRightMass = useMemo(() => {
    return rightPanItems.reduce((acc, it) => acc + (it.type === 'x' ? trueSolution : it.value), 0);
  }, [rightPanItems, trueSolution]);

  // MOD A: Serbest Terazi Değerlendirmesi
  const freeScaleEval = useMemo(() => {
    return evaluateFreeScale(freeLeftItems, freeRightItems, freeHiddenX);
  }, [freeLeftItems, freeRightItems, freeHiddenX]);

  // 2D SVG Terazi Eğim Açısı (-20° ile +20° arası)
  const tiltAngle2D = useMemo(() => {
    if (isTilting) return manualTiltAngle;
    const diff = playMode === 'equation' ? currentLeftMass - currentRightMass : freeScaleEval.diff;
    if (diff === 0) return 0;
    // Sol kefe ağırsa (diff > 0): SVG saat yönünün tersine (-eğim: sol aşağı iner, sağ yukarı kalkar)
    // Sağ kefe ağırsa (diff < 0): SVG saat yönünde (+eğim: sağ aşağı iner, sol yukarı kalkar)
    const angleMag = Math.min(22, 10 + Math.min(12, Math.abs(diff) * 2));
    return diff > 0 ? -angleMag : angleMag;
  }, [isTilting, manualTiltAngle, playMode, currentLeftMass, currentRightMass, freeScaleEval.diff]);

  // Geri Al (Undo) Fonksiyonu
  const handleUndo = useCallback(() => {
    if (playMode === 'equation') {
      if (history.length === 0) {
        setFeedback({ type: 'info', message: 'Geri alınacak önceki hamle bulunmuyor.' });
        return;
      }
      const last = history[history.length - 1];
      setCurrentEq(last.currentEq);
      setSteps(last.steps);
      setHistory(prev => prev.slice(0, -1));
      setSolved(false);
      playSound('move');
      setFeedback({ type: 'info', message: `Son hamle geri alındı: ${last.description}` });
    } else {
      // Serbest modda son eklenen nesneyi kaldır
      if (freeLeftItems.length > 0) {
        setFreeLeftItems(prev => prev.slice(0, -1));
        playSound('move');
      } else if (freeRightItems.length > 0) {
        setFreeRightItems(prev => prev.slice(0, -1));
        playSound('move');
      }
    }
  }, [playMode, history, freeLeftItems, freeRightItems, playSound]);

  // Sıfırla (Reset)
  const handleReset = useCallback(() => {
    if (playMode === 'equation') {
      setCurrentEq(equation);
      setSteps([equationToString(equation)]);
      setHistory([]);
      setSolved(false);
      setStudentAnswer('');
      setFeedback({ type: 'info', message: 'Denklem başlangıç dengesine sıfırlandı.' });
    } else {
      setFreeLeftItems([]);
      setFreeRightItems([]);
      setFeedback({ type: 'info', message: 'Kefeler tamamen boşaltıldı.' });
    }
    playSound('click');
  }, [playMode, equation, playSound]);

  // 3 Aşamalı İpucu Çağırma
  const handleGetHint = useCallback(() => {
    playSound('hint');
    setHintLevel(prev => Math.min(3, prev + 1));
    setShowHintModal(true);
    setStats(s => ({ ...s, hintsUsed: s.hintsUsed + 1 }));
  }, [playSound]);

  // Başarı Tetikleme
  const triggerSuccess = useCallback((resultValue: number) => {
    playSound('win');
    setSolved(true);
    const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
    setStats(s => ({
      ...s,
      tasksCompleted: s.tasksCompleted + 1,
      correctAttempts: s.correctAttempts + 1,
    }));
    setConcepts(c => ({
      ...c,
      equalityBalance: c.equalityBalance + 1,
      isolation: c.isolation + 1,
      equivalencePrinciple: c.equivalencePrinciple + 1,
      inverseOperations: c.inverseOperations + 1,
      multiStepLinear: difficulty === 'zor' ? c.multiStepLinear + 1 : c.multiStepLinear,
    }));
    setFeedback({
      type: 'success',
      message: `🎉 Tebrikler! x = ${resultValue} bulundu! Terazi mükemmel dengede ve denklem çözüldü!`,
    });
    recordGameResult('algebra', true, 100, timeSpent);
  }, [playSound, stats.startTime, difficulty, recordGameResult]);

  // MOD B: İki Kefeye Eşit İşlem Uygulama (Denklik İlkesi Simülasyonu)
  const applyBalancedOperation = useCallback((
    type: 'add' | 'subtract' | 'multiply' | 'divide',
    val: number,
    isVar: boolean = false
  ) => {
    if (solved || isTilting) return;

    // Snapshot kaydet
    setHistory(prev => [
      ...prev,
      {
        currentEq,
        leftItems: leftPanItems,
        rightItems: rightPanItems,
        steps,
        description: `${type === 'subtract' ? '−' : type === 'add' ? '+' : type === 'divide' ? '÷' : '×'}${isVar ? `${val}x` : val} (Her İki Kefe)`,
      },
    ]);

    const res = applyOperation(currentEq, { type, value: val, isVariable: isVar, applyTo: 'both' });
    if (!res.isValid) {
      playSound('wrong');
      setFeedback({ type: 'error', message: res.errorMessage || 'Geçersiz işlem.' });
      return;
    }

    const nextEq = res.newEq || res.newEquation;
    const opLabel = `${type === 'add' ? '+' : type === 'subtract' ? '−' : type === 'multiply' ? '×' : '÷'}${isVar ? (val === 1 ? 'x' : `${val}x`) : val}`;

    // Yumuşak fiziksel geçiş: Önce ilk kefe hareketlenir, ardından eşitlik tamamlanınca yerine oturur
    setIsTilting(true);
    setManualTiltAngle(type === 'subtract' ? 14 : -14);
    playSound('move');

    tiltTimerRef.current = setTimeout(() => {
      setManualTiltAngle(0);
      setCurrentEq(nextEq);
      setSteps(prev => [...prev, equationToString(nextEq)]);

      setTimeout(() => {
        setIsTilting(false);
        playSound('click');

        // Otomatik izolasyon kontrolü
        const stage = getEquationStage(nextEq);
        if (stage.isIsolated && stage.isolatedValue !== undefined) {
          triggerSuccess(stage.isolatedValue);
        } else {
          setFeedback({
            type: 'info',
            message: `Denklik korundu: Her iki kefeye ${opLabel} uygulandı. Terazi yatay dengede ✓`,
          });
        }
      }, 350);
    }, 450);
  }, [solved, isTilting, currentEq, leftPanItems, rightPanItems, steps, playSound, triggerSuccess]);

  // MOD B: Tek Kefeden Nesne Çıkarma (Denge Bozulmasının Öğretici Görsel Kanıtı)
  const handleRemoveItem = useCallback((side: 'left' | 'right', item: PanItem) => {
    if (solved || isTilting) return;

    // Snapshot
    setHistory(prev => [
      ...prev,
      {
        currentEq,
        leftItems: leftPanItems,
        rightItems: rightPanItems,
        steps,
        description: `${side === 'left' ? 'Sol' : 'Sağ'} kefeden ${item.label} çıkarıldı`,
      },
    ]);

    const isLeft = side === 'left';
    const nextEq: Equation = { ...currentEq };

    if (item.type === 'x') {
      if (isLeft) nextEq.leftA = Math.max(0, nextEq.leftA - 1);
      else nextEq.rightA = Math.max(0, nextEq.rightA - 1);
    } else {
      if (isLeft) nextEq.leftB = nextEq.leftB - item.value;
      else nextEq.rightB = nextEq.rightB - item.value;
    }

    setCurrentEq(nextEq);
    playSound('move');

    // Denge bozuldu uyarısı ve eğitimsel geri bildirim
    const isNowBalanced = (nextEq.leftA * trueSolution + nextEq.leftB) === (nextEq.rightA * trueSolution + nextEq.rightB);
    if (!isNowBalanced) {
      playSound('wrong');
      setStats(s => ({ ...s, wrongAttempts: s.wrongAttempts + 1 }));
      setFeedback({
        type: 'error',
        message: `⚠️ Denge Bozuldu! ${side === 'left' ? 'Sol' : 'Sağ'} kefeden ${item.label} kaldırdın ama karşı kefeye dokunmadın. Terazinin yeniden yatay konuma gelmesi için karşı kefeden de ${item.label} kaldırmalısın!`,
      });
    } else {
      setFeedback({
        type: 'success',
        message: `✓ Harika! Her iki kefe eşitlendi ve denge sağlandı!`,
      });
      const stage = getEquationStage(nextEq);
      if (stage.isIsolated && stage.isolatedValue !== undefined) {
        triggerSuccess(stage.isolatedValue);
      }
    }
  }, [solved, isTilting, currentEq, leftPanItems, rightPanItems, steps, playSound, trueSolution, triggerSuccess]);

  // Sürükle ve Bırak (Drag & Drop) Olayları
  const handleDragStart = (type: 'x' | 'constant', value: number) => {
    setDraggedItem({ type, value });
  };

  const handleDropOnPan = (side: 'left' | 'right') => {
    if (!draggedItem) return;
    setHoveredPan(null);

    if (playMode === 'free') {
      const newItem: FreeScaleItem = {
        id: `free-${side}-${Date.now()}-${Math.random()}`,
        type: draggedItem.type,
        value: draggedItem.value,
        label: draggedItem.type === 'x' ? 'x' : `${draggedItem.value}`,
      };
      if (side === 'left') {
        setFreeLeftItems(prev => [...prev, newItem]);
      } else {
        setFreeRightItems(prev => [...prev, newItem]);
      }
      playSound('click');
    } else {
      // Denklem çözme modunda kefeye ağırlık ekleme
      const isLeft = side === 'left';
      const nextEq = { ...currentEq };
      if (draggedItem.type === 'x') {
        if (isLeft) nextEq.leftA += 1;
        else nextEq.rightA += 1;
      } else {
        if (isLeft) nextEq.leftB += draggedItem.value;
        else nextEq.rightB += draggedItem.value;
      }
      setCurrentEq(nextEq);
      playSound('click');
      setFeedback({
        type: 'info',
        message: `${side === 'left' ? 'Sol' : 'Sağ'} kefeye ${draggedItem.type === 'x' ? '1x' : draggedItem.value} eklendi.`,
      });
    }
    setDraggedItem(null);
  };

  // Serbest Kefe Nesnesini Kaldırma
  const handleRemoveFreeItem = (side: 'left' | 'right', id: string) => {
    if (side === 'left') {
      setFreeLeftItems(prev => prev.filter(i => i.id !== id));
    } else {
      setFreeRightItems(prev => prev.filter(i => i.id !== id));
    }
    playSound('move');
  };

  // Cevap Doğrulama (Doğrudan sayı girişi)
  const handleCheckAnswer = () => {
    if (!studentAnswer || solved) return;
    const num = parseFloat(studentAnswer);
    if (isNaN(num)) return;

    const val = validateStudentAnswer(equation, num);
    if (val.isCorrect) {
      triggerSuccess(num);
    } else {
      playSound('wrong');
      setStats(s => ({ ...s, wrongAttempts: s.wrongAttempts + 1 }));
      setFeedback({ type: 'error', message: val.explanation });
    }
  };

  const stageInfo = getEquationStage(currentEq);
  const recommendedOps = getRecommendedOperations(currentEq);
  const progressiveHintData = getProgressiveHints(currentEq, hintLevel || 1);

  return (
    <div className="min-h-screen pb-16 bg-stone-50 select-none font-sans text-zinc-900">
      {/* ======================= ÜST BAŞLIK & GEZİNTİ ÇUBUĞU ======================= */}
      <header className="border-b-2 border-zinc-900 bg-white/95 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          {/* Sol: Geri Dönüş & Başlık */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentGame(null)}
              className="sketch-btn text-xs font-bold py-1.5 px-3"
            >
              ← Ana Sayfa
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 font-mono tracking-wider">
                  CEBİR TERAZİSİ
                </h1>
                <div className="text-[10px] text-zinc-500 font-mono -mt-0.5">
                  Fiziksel Denge & Birinci Dereceden Denklem Simülasyonu
                </div>
              </div>
            </div>
          </div>

          {/* Orta: Mod Seçimi (Mod A: Serbest Terazi vs Mod B: Denklem Çözme) */}
          <div className="flex p-0.5 rounded-xl border-2 border-zinc-900 bg-zinc-100 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setPlayMode('free');
                playSound('click');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                playMode === 'free'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm ring-1 ring-amber-600'
                  : 'text-zinc-700 hover:text-zinc-900'
              }`}
            >
              🖐️ Mod A: Serbest Terazi
            </button>
            <button
              type="button"
              onClick={() => {
                setPlayMode('equation');
                playSound('click');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                playMode === 'equation'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-700 hover:text-zinc-900'
              }`}
            >
              🎯 Mod B: Denklem Çözme
            </button>
          </div>

          {/* Sağ: Yardım & Rapor Butonları */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-2.5 py-1.5 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-xs font-bold font-mono shadow-[1px_1px_0px_#18181b] flex items-center gap-1.5"
              title="Öğrenme Raporu"
            >
              <span>📊</span> Rapor
            </button>

            <button
              onClick={() => setShowRulesModal(true)}
              className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-50 font-bold text-xs flex items-center justify-center shadow-[1px_1px_0px_#18181b]"
              title="Kurallar & Pedagojik Mantık"
            >
              ?
            </button>
          </div>
        </div>

        {/* Araç Çubuğu (Toolbar): Sıfırla, Geri Al, İpucu, Yeni Görev, 2D/3D Seçici */}
        <div className="border-t border-zinc-200 bg-zinc-50/90 py-1.5 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            {/* Sol Araçlar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 rounded-md border border-zinc-800 bg-white hover:bg-zinc-100 font-bold active:scale-95 transition-all shadow-sm"
              >
                🔄 Sıfırla
              </button>
              <button
                type="button"
                onClick={handleUndo}
                className="px-2.5 py-1 rounded-md border border-zinc-800 bg-white hover:bg-zinc-100 font-bold active:scale-95 transition-all shadow-sm"
              >
                ↩️ Geri Al
              </button>
              {playMode === 'equation' && (
                <>
                  <button
                    type="button"
                    onClick={handleGetHint}
                    className="px-2.5 py-1 rounded-md border border-zinc-800 bg-amber-200 hover:bg-amber-300 font-bold text-amber-950 active:scale-95 transition-all shadow-sm"
                  >
                    💡 İpucu Al ({hintLevel}/3)
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewProblem(difficulty)}
                    className="px-2.5 py-1 rounded-md border border-zinc-800 bg-white hover:bg-zinc-100 font-bold active:scale-95 transition-all shadow-sm"
                  >
                    🔀 Yeni Denklem
                  </button>
                </>
              )}
            </div>

            {/* Sağ Araçlar: Zorluk & 2D/3D Görünüm */}
            <div className="flex items-center gap-3">
              {playMode === 'equation' && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-zinc-500">Zorluk:</span>
                  {(['kolay', 'orta', 'zor'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-all border ${
                        difficulty === d
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* 2D / 3D Görünüm Anahtarı */}
              <div className="flex items-center p-0.5 rounded-lg border border-zinc-800 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    viewMode === '2d' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                  }`}
                >
                  ✏️ 2B Çizim
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    viewMode === '3d' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                  }`}
                >
                  🧭 3B Realist
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ======================= ANA OYUN ALANI ======================= */}
      <main className="max-w-6xl mx-auto px-4 mt-4 space-y-4">
        {/* Mod B İçin 4 Aşamalı İlerleme Göstergesi */}
        {playMode === 'equation' && (
          <div className="paper-card !py-3 !px-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-zinc-500">Çözüm Aşaması:</span>
                <span className="text-xs font-mono font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  {stageInfo.stageName}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-zinc-700">
                Hedef Denklem: <span className="font-extrabold text-sm">{equationToString(equation)}</span>
              </div>
            </div>

            {/* İlerleme Çubuğu */}
            <div className="w-full h-2 rounded-full border border-zinc-800 bg-zinc-100 overflow-hidden">
              <motion.div
                className="h-full bg-zinc-900"
                initial={{ width: 0 }}
                animate={{ width: `${stageInfo.progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 140, damping: 18 }}
              />
            </div>
          </div>
        )}

        {/* Geri Bildirim Şeridi */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`p-3 rounded-xl border-2 font-mono text-xs font-bold shadow-sm flex items-center justify-between gap-2 ${
                feedback.type === 'success'
                  ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
                  : feedback.type === 'error'
                  ? 'border-rose-700 bg-rose-100 text-rose-950'
                  : 'border-zinc-800 bg-white text-zinc-900'
              }`}
            >
              <span>{feedback.message}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-xs text-zinc-500 hover:text-zinc-900 font-bold ml-2"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================= TERAZİ GÖRSEL ALANI ======================= */}
        <div className="paper-card relative overflow-hidden">
          {/* Üst Durum Göstergesi */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase">Mevcut Durum:</span>
              <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-zinc-50 font-mono font-extrabold text-sm shadow-[2px_2px_0px_#18181b]">
                {playMode === 'equation' ? equationToString(currentEq) : freeScaleEval.equationDisplay}
              </span>
            </div>

            {/* Denge Durum Rozeti */}
            <div
              className={`px-3 py-1 rounded-lg border-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                (playMode === 'equation' ? currentLeftMass === currentRightMass : freeScaleEval.isBalanced)
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-[2px_2px_0px_#059669]'
                  : 'border-rose-600 bg-rose-50 text-rose-800 shadow-[2px_2px_0px_#e11d48]'
              }`}
            >
              {(playMode === 'equation' ? currentLeftMass === currentRightMass : freeScaleEval.isBalanced) ? (
                <span>✓ KEFELER DENGEDE (Yatay Eşitlik)</span>
              ) : (
                <span>
                  ≠ {((playMode === 'equation' ? currentLeftMass > currentRightMass : freeScaleEval.diff > 0) ? 'SOL KEFE AĞIR (Aşağı Çöktü ↘)' : 'SAĞ KEFE AĞIR (Aşağı Çöktü ↘)')}
                </span>
              )}
            </div>
          </div>

          {/* TERAZİ BİLEŞENİ (2B SVG VEYA 3B R3F) */}
          {viewMode === '3d' ? (
            <div className="relative">
              <BalanceScale3D
                leftItems={playMode === 'equation' ? leftPanItems : freeLeftItems.map(i => ({ id: i.id, type: i.type, value: i.value, label: i.label }))}
                rightItems={playMode === 'equation' ? rightPanItems : freeRightItems.map(i => ({ id: i.id, type: i.type, value: i.value, label: i.label }))}
                leftMass={playMode === 'equation' ? currentLeftMass : freeScaleEval.leftMass}
                rightMass={playMode === 'equation' ? currentRightMass : freeScaleEval.rightMass}
                onItemClick={(side, item) => {
                  if (playMode === 'equation') {
                    handleRemoveItem(side, item);
                  } else {
                    handleRemoveFreeItem(side, item.id);
                  }
                }}
                interactive={!solved}
                externalTilt={manualTiltAngle}
                isTilting={isTilting}
              />
            </div>
          ) : (
            /* 2B SVG HAREKETLİ TERAZİ */
            <div className="flex justify-center py-4 bg-stone-100/70 rounded-2xl border-2 border-dashed border-zinc-300 relative select-none overflow-hidden">
              <svg width="100%" height="320" viewBox="0 0 640 320" className="max-w-2xl overflow-visible">
                {/* Zemin Kaidesi */}
                <ellipse cx="320" cy="290" rx="95" ry="14" fill="#f4f4f5" stroke="#18181b" strokeWidth="2.5" />
                <rect x="313" y="75" width="14" height="215" rx="3" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />

                {/* Destek Üçgeni */}
                <polygon points="300,290 340,290 320,205" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

                {/* Açı Skalası */}
                <g transform="translate(320, 80)">
                  <path d="M -35 -40 A 53 53 0 0 1 35 -40" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="2 3" />
                  <line x1="0" y1="-46" x2="0" y2="-54" stroke="#059669" strokeWidth="2" />
                </g>

                {/* Dönen Kiriş ve Askı Montajı */}
                <g transform="translate(320, 80)">
                  <motion.g
                    animate={{ rotate: Math.max(-22, Math.min(22, tiltAngle2D)) }}
                    transition={{ type: 'spring', stiffness: 140, damping: 12, mass: 0.9 }}
                  >
                    {/* Yatay Denge Kirişi */}
                    <rect x="-240" y="-5" width="480" height="10" rx="5" fill="#18181b" stroke="#18181b" strokeWidth="1" />
                    
                    {/* Merkez Destek / Mesnet Pimi (Eşittir = / Eşit Değil ≠ Sembolü) */}
                    <circle
                      cx="0"
                      cy="0"
                      r="16"
                      fill={Math.abs(tiltAngle2D) < 1 ? '#10b981' : '#f59e0b'}
                      stroke="#18181b"
                      strokeWidth="2.5"
                    />
                    <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="monospace">
                      {Math.abs(tiltAngle2D) < 1 ? '=' : '≠'}
                    </text>
                    <polygon points="-2.5,0 2.5,0 0,-44" fill={Math.abs(tiltAngle2D) < 1 ? '#059669' : '#e11d48'} stroke="#18181b" strokeWidth="1.5" />

                    {/* SOL KEFE ASKI MONTAJI (Kefeler yerçekimi ile daima yatay kalır!) */}
                    <g transform="translate(-190, 0)">
                      <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
                      <motion.g
                        animate={{ rotate: -Math.max(-22, Math.min(22, tiltAngle2D)) }}
                        transition={{ type: 'spring', stiffness: 140, damping: 12, mass: 0.9 }}
                      >
                        {/* Askı Zincirleri */}
                        <line x1="0" y1="0" x2="-48" y2="82" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="0" y1="0" x2="48" y2="82" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />

                        {/* Sol Kefe Tabağı & Dropzone */}
                        <g transform="translate(0, 82)">
                          <ellipse
                            cx="0"
                            cy="0"
                            rx="76"
                            ry="16"
                            fill={hoveredPan === 'left' ? '#fef08a' : '#ffffff'}
                            stroke="#18181b"
                            strokeWidth={hoveredPan === 'left' ? '3.5' : '2.5'}
                            strokeDasharray={hoveredPan === 'left' ? '4 2' : 'none'}
                          />
                          <path d="M -76 0 C -76 16, 76 16, 76 0" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

                          {/* Kefe İçi Nesneler */}
                          <g transform="translate(0, -18)">
                            {(playMode === 'equation' ? leftPanItems : freeLeftItems).map((it, idx) => {
                              const total = (playMode === 'equation' ? leftPanItems : freeLeftItems).length;
                              const xOffset = -total * 13 + idx * 26 + 13;
                              return (
                                <g
                                  key={it.id}
                                  transform={`translate(${xOffset}, -6)`}
                                  className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                  onClick={() => {
                                    if (playMode === 'equation') handleRemoveItem('left', it as PanItem);
                                    else handleRemoveFreeItem('left', it.id);
                                  }}
                                >
                                  <title>{it.type === 'x' ? 'x kutusu (tıkla ve kaldır)' : `${it.value} birim ağırlık (tıkla ve kaldır)`}</title>
                                  {it.type === 'x' ? (
                                    <>
                                      <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#2563eb" stroke="#18181b" strokeWidth="2" />
                                      <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">x</text>
                                    </>
                                  ) : (
                                    <>
                                      <circle cx="0" cy="0" r="13" fill="#f59e0b" stroke="#18181b" strokeWidth="2" />
                                      <text x="0" y="4.5" textAnchor="middle" fill="#18181b" fontSize="11" fontWeight="bold">{it.value}</text>
                                    </>
                                  )}
                                </g>
                              );
                            })}
                          </g>

                          <text x="0" y="34" textAnchor="middle" fill="#18181b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                            Sol: {playMode === 'equation' ? formatSide(currentEq.leftA, currentEq.leftB) : freeScaleEval.leftFormula}
                          </text>
                        </g>
                      </motion.g>
                    </g>

                    {/* SAĞ KEFE ASKI MONTAJI (Kefeler yerçekimi ile daima yatay kalır!) */}
                    <g transform="translate(190, 0)">
                      <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
                      <motion.g
                        animate={{ rotate: -Math.max(-22, Math.min(22, tiltAngle2D)) }}
                        transition={{ type: 'spring', stiffness: 140, damping: 12, mass: 0.9 }}
                      >
                        {/* Askı Zincirleri */}
                        <line x1="0" y1="0" x2="-48" y2="82" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="0" y1="0" x2="48" y2="82" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />

                        {/* Sağ Kefe Tabağı & Dropzone */}
                        <g transform="translate(0, 82)">
                          <ellipse
                            cx="0"
                            cy="0"
                            rx="76"
                            ry="16"
                            fill={hoveredPan === 'right' ? '#fef08a' : '#ffffff'}
                            stroke="#18181b"
                            strokeWidth={hoveredPan === 'right' ? '3.5' : '2.5'}
                            strokeDasharray={hoveredPan === 'right' ? '4 2' : 'none'}
                          />
                          <path d="M -76 0 C -76 16, 76 16, 76 0" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

                          {/* Kefe İçi Nesneler */}
                          <g transform="translate(0, -18)">
                            {(playMode === 'equation' ? rightPanItems : freeRightItems).map((it, idx) => {
                              const total = (playMode === 'equation' ? rightPanItems : freeRightItems).length;
                              const xOffset = -total * 13 + idx * 26 + 13;
                              return (
                                <g
                                  key={it.id}
                                  transform={`translate(${xOffset}, -6)`}
                                  className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                  onClick={() => {
                                    if (playMode === 'equation') handleRemoveItem('right', it as PanItem);
                                    else handleRemoveFreeItem('right', it.id);
                                  }}
                                >
                                  <title>{it.type === 'x' ? 'x kutusu (tıkla ve kaldır)' : `${it.value} birim ağırlık (tıkla ve kaldır)`}</title>
                                  {it.type === 'x' ? (
                                    <>
                                      <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#2563eb" stroke="#18181b" strokeWidth="2" />
                                      <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">x</text>
                                    </>
                                  ) : (
                                    <>
                                      <circle cx="0" cy="0" r="13" fill="#f59e0b" stroke="#18181b" strokeWidth="2" />
                                      <text x="0" y="4.5" textAnchor="middle" fill="#18181b" fontSize="11" fontWeight="bold">{it.value}</text>
                                    </>
                                  )}
                                </g>
                              );
                            })}
                          </g>

                          <text x="0" y="34" textAnchor="middle" fill="#18181b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                            Sağ: {playMode === 'equation' ? formatSide(currentEq.rightA, currentEq.rightB) : freeScaleEval.rightFormula}
                          </text>
                        </g>
                      </motion.g>
                    </g>
                  </motion.g>
                </g>
              </svg>
            </div>
          )}

          {/* Sürükle-Bırak Kefeleri İçin Etkileşimli Bırakma Hedef Alanları (HTML5 Dropzones) */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div
              onDragOver={e => { e.preventDefault(); setHoveredPan('left'); }}
              onDragLeave={() => setHoveredPan(null)}
              onDrop={e => { e.preventDefault(); handleDropOnPan('left'); }}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                hoveredPan === 'left'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-400'
                  : 'border-zinc-300 bg-white hover:bg-zinc-50'
              }`}
            >
              <span className="text-xs font-mono font-bold text-zinc-700">
                📥 Sol Kefeye Bırak (veya tıkla)
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                Mevcut: {playMode === 'equation' ? `${leftPanItems.length} nesne (${currentLeftMass} br)` : `${freeLeftItems.length} nesne (${freeScaleEval.leftMass} br)`}
              </span>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setHoveredPan('right'); }}
              onDragLeave={() => setHoveredPan(null)}
              onDrop={e => { e.preventDefault(); handleDropOnPan('right'); }}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                hoveredPan === 'right'
                  ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-400'
                  : 'border-zinc-300 bg-white hover:bg-zinc-50'
              }`}
            >
              <span className="text-xs font-mono font-bold text-zinc-700">
                📥 Sağ Kefeye Bırak (veya tıkla)
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                Mevcut: {playMode === 'equation' ? `${rightPanItems.length} nesne (${currentRightMass} br)` : `${freeRightItems.length} nesne (${freeScaleEval.rightMass} br)`}
              </span>
            </div>
          </div>

          {/* ======================= ALT AĞIRLIK TEPSİSİ (SÜRÜKLE-BIRAK VE TIKLAMA KAYNAĞI) ======================= */}
          <div className="mt-4 pt-3 border-t-2 border-dashed border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase text-zinc-600 flex items-center gap-1.5">
                <span>🧰</span> Ağırlık Tepsisi:
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                (Parçayı tut kefeye sürükle veya doğrudan seçerek ekle)
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {/* x Kutusu */}
              <div
                draggable
                onDragStart={() => handleDragStart('x', 1)}
                onClick={() => {
                  if (playMode === 'free') {
                    setFreeLeftItems(prev => [...prev, { id: `free-x-${Date.now()}`, type: 'x', value: 1, label: 'x' }]);
                    playSound('click');
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 bg-blue-600 text-white font-mono font-black text-sm shadow-[2px_2px_0px_#18181b] cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex items-center gap-2"
                title="Bilinmeyen x kutusu (Sürükle bırak)"
              >
                <span>📦</span>
                <span>x Kutusu</span>
              </div>

              {/* Standart Pirinç Ağırlıklar: 1, 2, 3, 5, 10 */}
              {[1, 2, 3, 5, 10].map(val => (
                <div
                  key={val}
                  draggable
                  onDragStart={() => handleDragStart('constant', val)}
                  onClick={() => {
                    if (playMode === 'free') {
                      setFreeRightItems(prev => [...prev, { id: `free-c-${Date.now()}`, type: 'constant', value: val, label: `${val}` }]);
                      playSound('click');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border-2 border-zinc-900 bg-amber-400 text-zinc-950 font-mono font-black text-sm shadow-[2px_2px_0px_#18181b] cursor-grab active:cursor-grabbing hover:scale-105 transition-transform flex items-center gap-1.5"
                  title={`${val} birim pirinç ağırlık (Sürükle bırak)`}
                >
                  <span>⚖️</span>
                  <span>{val} br</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ======================= MOD B: ÖNERİLEN AKILLI HAMLELER VE İŞLEMLER ======================= */}
        {playMode === 'equation' && (
          <div className="paper-card space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono font-bold uppercase text-zinc-700 flex items-center gap-1.5">
                <span>⚡</span> Denklik İlkesi Hamleleri (Her İki Kefeye Eşit İşlem):
              </span>
              <button
                type="button"
                onClick={() => setShowSolutionSteps(!showSolutionSteps)}
                className="text-xs font-mono font-bold text-blue-700 hover:underline"
              >
                {showSolutionSteps ? '🙈 Adımları Gizle' : '📖 Matematiksel Çözüm Adımları'}
              </button>
            </div>

            {/* Önerilen Hızlı Butonlar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {recommendedOps.map((op: QuickAction, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyBalancedOperation(op.type, op.value, op.isVariable)}
                  disabled={solved || isTilting}
                  className="p-3 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-left transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded border border-zinc-900 bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      {op.badge}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Her İki Tarafa</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-900 truncate">{op.label}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{op.description}</div>
                </button>
              ))}
            </div>

            {/* Doğrudan Sayısal Cevap Girişi */}
            <div className="pt-3 border-t border-zinc-200 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-zinc-600">x Değerini Biliyor musun?</span>
              <input
                type="number"
                value={studentAnswer}
                onChange={e => setStudentAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheckAnswer()}
                placeholder="x = ?"
                className="w-24 px-3 py-1.5 rounded-lg border-2 border-zinc-900 font-mono font-bold text-sm bg-white"
                disabled={solved}
              />
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={solved || !studentAnswer}
                className="sketch-btn-dark py-1.5 px-4 text-xs font-bold"
              >
                Doğrula ✓
              </button>
            </div>
          </div>
        )}

        {/* Adım Adım Çözüm Dökümü Çekmecesi */}
        <AnimatePresence>
          {showSolutionSteps && playMode === 'equation' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="paper-card !bg-zinc-50 space-y-2 font-mono text-xs"
            >
              <div className="font-extrabold text-zinc-900 uppercase">Tam Matematiksel Çözüm İzlemi:</div>
              {generateSolutionSteps(equation).map((st, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200">
                  <span className="text-zinc-600">{i + 1}. {st.description}</span>
                  <span className="font-black text-zinc-900">{st.leftSide} = {st.rightSide}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ======================= 3 AŞAMALI KADEMELİ İPUCU MODALI ======================= */}
      <AnimatePresence>
        {showHintModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <h3 className="font-mono font-extrabold text-sm uppercase text-zinc-900">
                    {progressiveHintData.levelTitle}
                  </h3>
                </div>
                <button onClick={() => setShowHintModal(false)} className="font-mono text-xs font-bold text-zinc-500 hover:text-zinc-900">
                  ✕
                </button>
              </div>

              {/* 1. Aşama: Düşündürücü Soru */}
              <div className="p-3 rounded-xl border border-zinc-800 bg-amber-50">
                <div className="text-[11px] font-mono font-bold text-amber-900 uppercase mb-1">
                  ❓ Düşündürücü Soru:
                </div>
                <p className="text-xs font-medium text-zinc-800">{progressiveHintData.question}</p>
              </div>

              {/* 2. Aşama: Görsel Yönlendirme (Hint seviyesi >= 2 ise) */}
              {hintLevel >= 2 && (
                <div className="p-3 rounded-xl border border-blue-800 bg-blue-50">
                  <div className="text-[11px] font-mono font-bold text-blue-900 uppercase mb-1">
                    🔍 Görsel Yönlendirme:
                  </div>
                  <p className="text-xs font-medium text-zinc-800">{progressiveHintData.visualCue}</p>
                </div>
              )}

              {/* 3. Aşama: Adım Adım Çözüm Desteği (Hint seviyesi >= 3 ise) */}
              {hintLevel >= 3 && (
                <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-50">
                  <div className="text-[11px] font-mono font-bold text-emerald-900 uppercase mb-1">
                    🎯 Adım Adım Doğrudan İşlem:
                  </div>
                  <p className="text-xs font-bold text-emerald-950">{progressiveHintData.actionStep}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {hintLevel < 3 && (
                  <button
                    type="button"
                    onClick={() => setHintLevel(l => l + 1)}
                    className="sketch-btn flex-1 py-2 text-xs font-bold"
                  >
                    Daha Fazla İpucu ({hintLevel + 1}/3) →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHintModal(false)}
                  className="sketch-btn-dark flex-1 py-2 text-xs font-bold"
                >
                  Anladım, Uygulayayım ✓
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= KURALLAR VE PEDAGOJİK KILAVUZ MODALI ======================= */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-lg w-full p-6 space-y-3 font-mono text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-zinc-200">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <span>📖</span> Cebir Terazisi Pedagojik Kılavuzu:
                </h3>
                <button onClick={() => setShowRulesModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  ✕
                </button>
              </div>

              <ul className="space-y-2 text-zinc-700">
                <li>• <strong>Merkez Noktası (Mesnet):</strong> Terazinin denge noktası, matematikteki eşittir (=) işaretini temsil eder.</li>
                <li>• <strong>Kefeler:</strong> Terazinin sol ve sağ kefeleri denklemin sol ve sağ taraflarını simgeler.</li>
                <li>• <strong>Bilinmeyenler (x):</strong> Kütlesi başlangıçta gizli tutulan kutulardır.</li>
                <li>• <strong>Denklik İlkesi:</strong> Terazi dengedeyken bir taraftan ağırlık alırsan terazi bozulur! Dengeyi korumak için aynı işlemi karşı kefeye de uygulamalısın.</li>
                <li>• <strong>Çözüm Hedefi:</strong> Bir kefede yalnızca 1 adet x kutusu, karşı kefede ise sadece sayı kalsın: <code>x = ?</code></li>
              </ul>

              <div className="pt-2 text-right">
                <button onClick={() => setShowRulesModal(false)} className="sketch-btn-dark px-4 py-2 font-bold text-xs">
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= ÖĞRENME RAPORU VE KAVRAM ANALİTİĞİ MODALI ======================= */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-md w-full p-6 space-y-4 font-mono text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-zinc-200">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <span>📊</span> Öğrenci Öğrenme & Kavram Raporu:
                </h3>
                <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  ✕
                </button>
              </div>

              {/* Temel Metrikler */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                  <div className="text-zinc-500 text-[10px]">Çözülen Denklem:</div>
                  <div className="text-base font-black text-zinc-900">{stats.tasksCompleted} Adet</div>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                  <div className="text-zinc-500 text-[10px]">Başarı Oranı:</div>
                  <div className="text-base font-black text-emerald-700">
                    %{stats.tasksCompleted > 0 ? Math.round((stats.correctAttempts / (stats.correctAttempts + stats.wrongAttempts || 1)) * 100) : 100}
                  </div>
                </div>
              </div>

              {/* Kavram Kazanımları */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-zinc-600 uppercase">Öğrenilen Matematiksel Kavramlar:</div>
                {[
                  { name: 'Eşitlik ve Denge', score: concepts.equalityBalance, desc: 'Kefeler arasındaki denge mantığını kavrama' },
                  { name: 'Bilinmeyenin İzolasyonu', score: concepts.isolation, desc: "x'i tek başına bırakma stratejisi" },
                  { name: 'Denklik İlkesi', score: concepts.equivalencePrinciple, desc: 'İki tarafa da aynı işlemi uygulama' },
                  { name: 'Ters İşlemler', score: concepts.inverseOperations, desc: 'Toplamayı çıkarma, çarpmayı bölme ile nötrleme' },
                ].map((c, i) => (
                  <div key={i} className="p-2 rounded-lg border border-zinc-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-900">{c.name}</div>
                      <div className="text-[10px] text-zinc-500">{c.desc}</div>
                    </div>
                    <span className="font-black text-emerald-700">✓ {c.score} Pratik</span>
                  </div>
                ))}
              </div>

              <div className="text-right pt-2">
                <button onClick={() => setShowReportModal(false)} className="sketch-btn-dark px-4 py-2 font-bold text-xs">
                  Raporu Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
