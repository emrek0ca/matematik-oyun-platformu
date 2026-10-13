import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Operator,
  generatePuzzle,
  getHint,
  getDetailedSolutions,
  getSmartSuggestion,
  StepByStepSolution,
  resetGame,
  applyStep,
  undoStep,
  InteractiveGameState,
} from '../engines/game24Engine';

type Difficulty = 'kolay' | 'orta' | 'zor';
type GameMode = 'zen' | 'rush';

const SUITS = [
  { symbol: '♠', name: 'Maça', color: 'text-zinc-900' },
  { symbol: '♥', name: 'Kupa', color: 'text-rose-600' },
  { symbol: '♦', name: 'Karo', color: 'text-rose-600' },
  { symbol: '♣', name: 'Sinek', color: 'text-zinc-900' },
];

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  symbol: string;
  color: string;
}

// İskambil Oyun Kartı Bileşeni
function PlayingCard({
  value,
  id,
  label,
  suitIndex,
  isSelected,
  isHoverTarget,
  isUsed,
  isResult,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  value: number;
  id: number;
  label?: string;
  suitIndex: number;
  isSelected: boolean;
  isHoverTarget?: boolean;
  isUsed?: boolean;
  isResult?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const suit = SUITS[suitIndex % SUITS.length];
  const displayVal = String(label || (value % 1 === 0 ? value : value.toFixed(1)));

  return (
    <motion.button
      type="button"
      whileHover={!isUsed ? { scale: 1.05, y: -3 } : {}}
      whileTap={!isUsed ? { scale: 0.96 } : {}}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={isUsed}
      className={`relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl transition-all duration-150 select-none flex flex-col items-center justify-center p-2 border-2 border-zinc-900 overflow-hidden ${
        isSelected
          ? 'bg-zinc-900 text-white shadow-[2px_2px_0px_#18181b] -translate-y-1 ring-2 ring-zinc-900'
          : isHoverTarget
          ? 'bg-amber-100 text-zinc-900 shadow-[3px_3px_0px_#18181b] ring-2 ring-amber-500 scale-105'
          : isResult
          ? 'bg-amber-50 text-amber-950 shadow-[3px_3px_0px_#18181b]'
          : isUsed
          ? 'bg-zinc-100 text-zinc-300 opacity-30 shadow-none'
          : 'bg-white text-zinc-900 hover:bg-zinc-50 shadow-[3px_3px_0px_#18181b]'
      }`}
    >
      {/* Sol Üst Takım Simgesi */}
      <div className="absolute top-2 left-2.5 flex items-center pointer-events-none">
        <span className={`text-xs font-bold leading-none ${isSelected ? 'text-white' : suit.color}`}>
          {suit.symbol}
        </span>
      </div>

      {/* Sağ Üst: Ara Sonuç Rozeti */}
      {isResult && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border border-zinc-900 bg-amber-300 text-zinc-950 leading-none">
            ARA
          </span>
        </div>
      )}

      {/* Merkezdeki Temiz Büyük Sayı */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`font-mono font-black leading-none ${
            displayVal.length > 3 ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {displayVal}
        </span>
      </div>

      {/* Sağ Alt Küçük Takım Simgesi (Düz ve Taşmayan) */}
      <div className="absolute bottom-2 right-2.5 flex items-center pointer-events-none opacity-50">
        <span className={`text-[11px] leading-none ${isSelected ? 'text-white' : suit.color}`}>
          {suit.symbol}
        </span>
      </div>
    </motion.button>
  );
}

// Dört İşlem Butonu
function OperatorButton({
  op,
  isSelected,
  label,
  onClick,
}: {
  op: Operator;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-xl sm:text-2xl font-black border-2 border-zinc-900 transition-all flex flex-col items-center justify-center ${
        isSelected
          ? 'bg-zinc-900 text-white shadow-[1px_1px_0px_#18181b] translate-x-[1px] translate-y-[1px]'
          : 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-[3px_3px_0px_#18181b] active:scale-95'
      }`}
      title={label}
    >
      <span>{op}</span>
    </button>
  );
}

// Hamle Geçmişi
function StepsHistory({
  steps,
}: {
  steps: Array<{
    number1: { value: number; label?: string };
    number2: { value: number; label?: string };
    operator: Operator;
    result: number;
    resultLabel?: string;
  }>;
}) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between text-xs font-mono font-bold p-2 rounded-lg border border-zinc-200 bg-zinc-50"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 w-4 font-bold">{i + 1}.</span>
            <span className="text-zinc-900">{step.number1.label || step.number1.value}</span>
            <span className="text-zinc-500 font-extrabold">{step.operator}</span>
            <span className="text-zinc-900">{step.number2.label || step.number2.value}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">=</span>
            <span className="text-emerald-700 font-black text-sm">
              {step.resultLabel || (step.result % 1 === 0 ? step.result : step.result.toFixed(2))}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Game24() {
  const { setCurrentGame, recordGameResult, playSound } = useAppStore();
  const [difficulty, setDifficulty] = useState<Difficulty>('kolay');
  const [gameMode, setGameMode] = useState<GameMode>('zen');

  // Rush modu
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('game24_rush_highscore') || '0', 10);
  });
  const [isRushGameOver, setIsRushGameOver] = useState(false);

  const [gameState, setGameState] = useState<InteractiveGameState | null>(null);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'hint' | 'info'; message: string } | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [solutions, setSolutions] = useState<StepByStepSolution[]>([]);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);

  const startTime = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const rushTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSparkles = useCallback(() => {
    const symbols = ['✦', '★', '24', '✓', '♠', '♥', '♦', '♣', '✨'];
    const colors = ['#2563eb', '#f59e0b', '#059669', '#e11d48', '#18181b'];
    const newSparkles: SparkleParticle[] = Array.from({ length: 16 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 280,
      y: -Math.random() * 140 - 20,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1600);
  }, []);

  const startNewGame = useCallback(() => {
    const nums = generatePuzzle(difficulty);
    setNumbers(nums);
    setGameState(resetGame(nums));
    setSelectedId(null);
    setSelectedOperator(null);
    setHoveredCardId(null);
    setFeedback(null);
    setShowSolutions(false);
    setHintsUsed(0);
    setSolutions([]);
    setTimer(0);
    setIsTimerRunning(true);
    startTime.current = Date.now();
  }, [difficulty]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Zen Sayaç
  useEffect(() => {
    if (isTimerRunning && gameMode === 'zen') {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, gameMode]);

  // Rush Modu Sayacı
  useEffect(() => {
    if (gameMode !== 'rush' || isRushGameOver) {
      if (rushTimerRef.current) clearInterval(rushTimerRef.current);
      return;
    }

    rushTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(rushTimerRef.current!);
          setIsRushGameOver(true);
          playSound('wrong');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (rushTimerRef.current) clearInterval(rushTimerRef.current);
    };
  }, [gameMode, isRushGameOver, playSound]);

  const restartRush = () => {
    setTimeLeft(60);
    setStreak(0);
    setIsRushGameOver(false);
    setSolvedCount(0);
    startNewGame();
  };

  // Klavye kısayolları (+, -, *, /, Esc, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '+') {
        setSelectedOperator('+');
        playSound('click');
      } else if (e.key === '-') {
        setSelectedOperator('-');
        playSound('click');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        setSelectedOperator('×');
        playSound('click');
      } else if (e.key === '/') {
        e.preventDefault();
        setSelectedOperator('÷');
        playSound('click');
      } else if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') {
        handleUndo();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedOperator(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function handleCardClick(id: number) {
    if (!gameState || gameState.isComplete || (gameMode === 'rush' && isRushGameOver)) return;
    playSound('click');

    if (selectedId === null) {
      setSelectedId(id);
    } else if (selectedId === id) {
      // Seçimi kaldır
      setSelectedId(null);
      setSelectedOperator(null);
    } else if (selectedOperator !== null) {
      // İşlemi uygula
      const result = applyStep(gameState, selectedId, id, selectedOperator);

      if (!result.success) {
        playSound('wrong');
        setFeedback({ type: 'error', message: result.error || 'Geçersiz işlem' });
      } else {
        playSound('move');
        setGameState(result.newState!);
        setSelectedId(null);
        setSelectedOperator(null);
        setHoveredCardId(null);
        setFeedback(null);

        // Oyun tamamlandı mı?
        if (result.newState!.isComplete) {
          const finalVal = result.newState!.finalValue;
          if (finalVal !== undefined && Math.abs(finalVal - 24) < 1e-6) {
            playSound('win');
            triggerSparkles();
            setIsTimerRunning(false);

            const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
            const basePts = Math.max(20, 200 - hintsUsed * 30 - Math.floor(elapsed / 4));
            const streakBonus = streak * 25;
            const pts = basePts + streakBonus;

            setScore(s => s + pts);
            setSolvedCount(c => c + 1);

            if (gameMode === 'rush') {
              const nextStreak = streak + 1;
              setStreak(nextStreak);
              setTimeLeft(t => Math.min(90, t + 15)); // +15s ek süre

              const newRushScore = (solvedCount + 1) * 150 + nextStreak * 50;
              if (newRushScore > highScore) {
                setHighScore(newRushScore);
                localStorage.setItem('game24_rush_highscore', String(newRushScore));
              }
            }

            setFeedback({
              type: 'success',
              message: `Mükemmel! 24 sonucuna tam olarak ulaşıldı! +${pts} Puan`,
            });

            recordGameResult('game24', true, pts, elapsed);
          } else {
            playSound('wrong');
            if (gameMode === 'rush') {
              setStreak(0);
              setTimeLeft(t => Math.max(5, t - 6)); // -6s hata cezası
            }
            setFeedback({
              type: 'error',
              message: `Sonuç ${finalVal?.toFixed(2) ?? '?'}, 24 değil. Geri al (↩) ve tekrar dene.`,
            });
          }
        }
      }
    } else {
      // Birinci kartı değiştir
      setSelectedId(id);
    }
  }

  function handleOperatorClick(op: Operator) {
    playSound('click');
    setSelectedOperator(op === selectedOperator ? null : op);
  }

  function handleUndo() {
    if (!gameState || gameState.steps.length === 0 || (gameMode === 'rush' && isRushGameOver)) return;
    playSound('click');
    setGameState(undoStep(gameState));
    setSelectedId(null);
    setSelectedOperator(null);
    setHoveredCardId(null);
    setFeedback(null);
  }

  function handleSmartTactic() {
    playSound('hint');
    const sugg = getSmartSuggestion(numbers);
    if (sugg) {
      setHintsUsed(h => h + 1);
      setFeedback({
        type: 'hint',
        message: `💡 Başlangıç Taktik Önerisi: '${sugg.card1}' ile '${sugg.card2}' sayılarını '${sugg.operator}' ile birleştir (${sugg.card1} ${sugg.operator} ${sugg.card2} = ${sugg.result}).`,
      });
    } else {
      handleDetailedHint();
    }
  }

  function handleDetailedHint() {
    playSound('hint');
    const stepCount = gameState ? gameState.steps.length : 0;
    const hint = getHint(numbers, stepCount);
    setHintsUsed(h => h + 1);
    setFeedback({ type: 'hint', message: hint });
  }

  function handleShowSolutions() {
    const sols = getDetailedSolutions(numbers);
    setSolutions(sols);
    setShowSolutions(true);
    setIsTimerRunning(false);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const operators: { op: Operator; label: string }[] = [
    { op: '+', label: 'Topla (+)' },
    { op: '-', label: 'Çıkar (−)' },
    { op: '×', label: 'Çarp (×)' },
    { op: '÷', label: 'Böl (÷)' },
  ];

  // Aktif önizleme hesabı
  const selectedCard = gameState?.currentNumbers.find(n => n.id === selectedId);
  const hoveredCard = gameState?.currentNumbers.find(n => n.id === hoveredCardId && n.id !== selectedId);

  let previewResult: string | null = null;
  if (selectedCard && selectedOperator && hoveredCard) {
    try {
      const v1 = selectedCard.value;
      const v2 = hoveredCard.value;
      let res: number | null = null;
      if (selectedOperator === '+') res = v1 + v2;
      else if (selectedOperator === '-') res = v1 - v2;
      else if (selectedOperator === '×') res = v1 * v2;
      else if (selectedOperator === '÷' && v2 !== 0) res = v1 / v2;

      if (res !== null) {
        previewResult = res % 1 === 0 ? String(res) : res.toFixed(2);
      }
    } catch {
      previewResult = null;
    }
  }

  const cardRemainingCount = gameState ? gameState.currentNumbers.length : 4;

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b-2 border-zinc-900 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => setCurrentGame(null)} className="sketch-btn text-xs font-bold">
            ← Ana Sayfa
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🃏</span>
            <h1 className="text-base font-extrabold text-zinc-900 font-mono tracking-wider">24 OYUNU</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Mod Seçimi */}
            <div className="flex p-0.5 rounded-lg border-2 border-zinc-900 bg-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setGameMode('zen');
                  setIsRushGameOver(false);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  gameMode === 'zen' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:text-zinc-900'
                }`}
              >
                🧘‍♀️ Serbest
              </button>
              <button
                type="button"
                onClick={() => {
                  setGameMode('rush');
                  restartRush();
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  gameMode === 'rush' ? 'bg-amber-500 text-zinc-900 font-extrabold shadow-sm' : 'text-zinc-700 hover:text-zinc-900'
                }`}
              >
                ⚡ 24 Sürat
              </button>
            </div>

            {gameMode === 'zen' ? (
              <span className="text-xs font-mono font-bold px-2 py-1 rounded border border-zinc-900 bg-zinc-100">
                ⏱ {formatTime(timer)}
              </span>
            ) : (
              <span className="text-xs font-mono font-bold px-2 py-1 rounded border border-zinc-900 bg-zinc-100">
                {score} P
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Rush Modu Durum Şeridi */}
      {gameMode === 'rush' && (
        <div className="bg-amber-100/90 border-b-2 border-zinc-900 py-2 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs font-mono font-bold">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded border border-zinc-900 ${
                  timeLeft <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-zinc-900'
                }`}
              >
                ⏱️ Kalan: {timeLeft}s
              </span>
              {streak > 1 && (
                <span className="px-2 py-0.5 rounded border border-zinc-900 bg-amber-400 text-zinc-950 font-black animate-bounce">
                  🔥 {streak}x Seri Kombo!
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-700">Çözülen: {solvedCount}</span>
              <span className="text-amber-900">En Yüksek: {highScore} P</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Zorluk & Yeni Oyun */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-600 font-mono">ZORLUK:</span>
            {(['kolay', 'orta', 'zor'] as Difficulty[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border-2 border-zinc-900 transition-all ${
                  difficulty === d
                    ? 'bg-zinc-900 text-white shadow-[2px_2px_0px_#18181b]'
                    : 'bg-white text-zinc-800 hover:bg-zinc-100 shadow-[1px_1px_0px_#18181b]'
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={startNewGame} className="sketch-btn text-xs font-bold">
              🔄 Yeni Kartlar Dağıt
            </button>
          </div>
        </div>

        {/* 24 İlerleme Adım Çubuğu (4 Kart -> 3 -> 2 -> 1 = 24!) */}
        <div className="paper-card !py-2.5 !px-4">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-700 mb-1.5">
            <span>HEDEF: 24'E ULAŞ</span>
            <span>
              {cardRemainingCount === 4 && '4 Kart (Başlangıç)'}
              {cardRemainingCount === 3 && '3 Kart Kaldı (1. Birleştirme Yapıldı)'}
              {cardRemainingCount === 2 && '2 Kart Kaldı (Son Adım!)'}
              {cardRemainingCount === 1 && '🎯 1 Kart Kaldı (Tamamlandı)'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[3, 2, 1].map((stepTarget, idx) => {
              const isDone = cardRemainingCount <= stepTarget;
              const isCurrent = cardRemainingCount === stepTarget + 1;
              return (
                <div
                  key={idx}
                  className={`py-1 rounded-lg border-2 border-zinc-900 text-center font-mono text-[11px] font-bold transition-all ${
                    isDone
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-amber-100 text-zinc-900 animate-pulse'
                      : 'bg-zinc-50 text-zinc-400'
                  }`}
                >
                  {idx + 1}. İşlem {isDone ? '✓' : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ana Oyun Masası (İskambil Kartları + Formül Önizleme) */}
        {gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Sol Kolon: Kart Masası & İşlemler */}
            <div className="lg:col-span-3 space-y-4">
              <div className="paper-card relative overflow-hidden">
                {/* Parıltı Parçacıkları */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {sparkles.map(p => (
                    <motion.span
                      key={p.id}
                      initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                      animate={{ opacity: 0, scale: 2, x: p.x, y: p.y }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="absolute text-2xl font-bold select-none"
                      style={{ color: p.color }}
                    >
                      {p.symbol}
                    </motion.span>
                  ))}
                </div>

                {/* Dinamik Canlı Denklem Önizleme Şeridi */}
                <div className="mb-4 text-center">
                  {selectedCard ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-zinc-900 bg-amber-50 shadow-[2px_2px_0px_#18181b] text-xs font-mono font-bold animate-fadeIn">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-white">
                        {selectedCard.label || selectedCard.value}
                      </span>
                      <span className="text-sm font-black text-zinc-900">
                        {selectedOperator || '?'}
                      </span>
                      {hoveredCard ? (
                        <>
                          <span className="px-2 py-0.5 rounded border border-zinc-900 bg-white">
                            {hoveredCard.label || hoveredCard.value}
                          </span>
                          {previewResult && (
                            <>
                              <span>=</span>
                              <span
                                className={`px-2 py-0.5 rounded font-black ${
                                  previewResult === '24'
                                    ? 'bg-emerald-600 text-white animate-bounce'
                                    : 'bg-zinc-200 text-zinc-900'
                                }`}
                              >
                                {previewResult} {previewResult === '24' && '🎯'}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-500">
                          {selectedOperator ? '👉 2. kartı seç' : '👉 Bir işlem (+, −, ×, ÷) seç'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-zinc-600 font-mono uppercase">
                      👉 Birleştirmek için birinci sayı kartına tıkla
                    </p>
                  )}
                </div>

                {/* İskambil Oyun Kartları Masası */}
                <div className="flex justify-center gap-3 sm:gap-4 flex-wrap mb-5 p-4 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 min-h-[140px] items-center">
                  {gameState.currentNumbers.map((n, idx) => (
                    <PlayingCard
                      key={n.id}
                      value={n.value}
                      id={n.id}
                      label={n.label}
                      suitIndex={idx}
                      isSelected={selectedId === n.id}
                      isHoverTarget={hoveredCardId === n.id && selectedId !== null && selectedOperator !== null}
                      isResult={n.isResult}
                      onClick={() => handleCardClick(n.id)}
                      onMouseEnter={() => setHoveredCardId(n.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                    />
                  ))}
                </div>

                {/* Dört İşlem Seçici */}
                <div className="flex justify-center gap-2.5 sm:gap-3">
                  {operators.map(item => (
                    <OperatorButton
                      key={item.op}
                      op={item.op}
                      label={item.label}
                      isSelected={selectedOperator === item.op}
                      onClick={() => handleOperatorClick(item.op)}
                    />
                  ))}
                </div>

                {/* Alt Bilgi & Klavye İpucu */}
                <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-xs font-mono text-zinc-600 flex-wrap gap-2">
                  <span>
                    Başlangıç: <strong className="text-zinc-900">{numbers.join(' · ')}</strong>
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Klavye: <kbd className="px-1 py-0.5 bg-zinc-100 border rounded">+</kbd>{' '}
                    <kbd className="px-1 py-0.5 bg-zinc-100 border rounded">-</kbd>{' '}
                    <kbd className="px-1 py-0.5 bg-zinc-100 border rounded">*</kbd>{' '}
                    <kbd className="px-1 py-0.5 bg-zinc-100 border rounded">/</kbd>{' '}
                    <kbd className="px-1 py-0.5 bg-zinc-100 border rounded">Backspace</kbd>
                  </span>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!gameState.steps.length || (gameMode === 'rush' && isRushGameOver)}
                  className="sketch-btn flex-1 text-xs font-bold disabled:opacity-40 min-w-[80px]"
                >
                  ↩ Geri Al
                </button>
                <button
                  type="button"
                  onClick={handleSmartTactic}
                  disabled={gameState.isComplete || (gameMode === 'rush' && isRushGameOver)}
                  className="sketch-btn flex-1 text-xs font-bold min-w-[90px]"
                >
                  ⚡ Taktik Öner
                </button>
                <button
                  type="button"
                  onClick={handleDetailedHint}
                  disabled={gameState.isComplete || (gameMode === 'rush' && isRushGameOver)}
                  className="sketch-btn flex-1 text-xs font-bold min-w-[90px]"
                >
                  💡 Adım İpucu
                </button>
                <button
                  type="button"
                  onClick={handleShowSolutions}
                  className="sketch-btn flex-1 text-xs font-bold min-w-[90px]"
                >
                  📖 Çözümler
                </button>
              </div>
            </div>

            {/* Sağ Kolon: İşlem Defteri, Çözümler ve Kurallar */}
            <div className="lg:col-span-2 space-y-4">
              {/* İşlem Defteri */}
              <div className="paper-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider font-mono">
                    📊 İşlem Defteri
                  </h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {gameState.steps.length} / 3 Adım
                  </span>
                </div>

                {gameState.steps.length === 0 ? (
                  <p className="text-zinc-400 text-xs font-mono py-2">
                    Henüz işlem yapılmadı. İki kart ve bir işlem seçerek kartları birleştirin.
                  </p>
                ) : (
                  <StepsHistory steps={gameState.steps} />
                )}
              </div>

              {/* Çözümler Çekmecesi */}
              <AnimatePresence>
                {showSolutions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="paper-card"
                  >
                    <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center justify-between font-mono">
                      <span>🎯 {solutions.length} Çözüm Yolu:</span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {solutions.map((sol, i) => (
                        <div key={i} className="p-2 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1">
                          <div className="text-xs font-bold font-mono text-zinc-900">
                            {i + 1}. Yol: {sol.expressionString} = 24
                          </div>
                          <div className="flex flex-col gap-0.5 pl-2 border-l-2 border-zinc-400">
                            {sol.steps.map((st, sIdx) => (
                              <span key={sIdx} className="text-[11px] font-mono text-zinc-700">
                                {sIdx + 1}. Adım: <strong className="text-emerald-700">{st}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Oyun Kuralları */}
              <div className="paper-card">
                <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5 font-mono">
                  📖 Kurallar
                </h3>
                <ul className="text-xs text-zinc-600 space-y-1">
                  <li>• Masadaki 4 kartın tamamını tam olarak 1 kez kullan.</li>
                  <li>• +, −, ×, ÷ işlemlerini istediğin sırada uygulayabilirsin.</li>
                  <li>• Sonuç kartı tam olarak <strong>24</strong> olmalıdır!</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Geri Bildirim */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={
                feedback.type === 'success'
                  ? 'feedback-correct'
                  : feedback.type === 'error'
                  ? 'feedback-wrong'
                  : feedback.type === 'hint'
                  ? 'feedback-hint'
                  : 'border-2 border-zinc-900 bg-white text-zinc-900 rounded-xl p-4 shadow-[2px_2px_0px_#18181b]'
              }
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span>{feedback.type === 'success' ? '🎉' : feedback.type === 'error' ? '❌' : '💡'}</span>
                  <span className="font-bold">{feedback.message}</span>
                </div>
                {feedback.type === 'success' && !isRushGameOver && (
                  <button
                    type="button"
                    onClick={startNewGame}
                    className="sketch-btn-dark text-xs px-3 py-1 font-bold"
                  >
                    Yeni Soru →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rush Modu Oyun Sonu Ekranı */}
        {gameMode === 'rush' && isRushGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="paper-card text-center py-6 border-2 border-rose-600 bg-rose-50/50 shadow-[4px_4px_0px_#e11d48]"
          >
            <div className="text-3xl mb-1">⏱️</div>
            <h2 className="text-xl font-black text-rose-900 mb-1">Süre Bitti!</h2>
            <p className="text-zinc-700 text-sm font-bold mb-3">
              Toplam Çözülen: {solvedCount} bulmaca | Skorun: {score} P | En Yüksek Skor: {highScore} P
            </p>
            <button
              type="button"
              onClick={restartRush}
              className="sketch-btn-dark px-6 py-2.5 text-sm font-bold"
            >
              🔄 Yeniden Dene
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
