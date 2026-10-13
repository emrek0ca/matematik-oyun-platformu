import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Equation,
  generateEquation,
  solveLinearEquation,
  equationToString,
  generateSolutionSteps,
  validateStudentAnswer,
  formatSide,
  applyOperation,
  calculateTiltAngle,
  getRecommendedOperations,
  getEquationStage,
  QuickAction,
} from '../engines/algebraEngine';

function fractionToString(f: { numerator: number; denominator: number }): string {
  if (f.denominator === 1) return `${f.numerator}`;
  return `${f.numerator}/${f.denominator}`;
}

type Difficulty = 'kolay' | 'orta' | 'zor';
type GameMode = 'zen' | 'rush';

interface GameState {
  equation: Equation;
  currentEq: Equation;
  solved: boolean;
  steps: string[];
  hintsUsed: number;
  startTime: number;
  score: number;
}

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  symbol: string;
  color: string;
}

function OperationPanel({
  onApply,
  disabled,
}: {
  onApply: (type: 'add' | 'subtract' | 'multiply' | 'divide', value: number, isVariable?: boolean) => void;
  disabled: boolean;
}) {
  const [opType, setOpType] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('subtract');
  const [isVariable, setIsVariable] = useState(false);
  const [value, setValue] = useState(1);
  const [inputVal, setInputVal] = useState('1');

  const ops = [
    { type: 'add' as const, label: '+ Ekle', symbol: '+' },
    { type: 'subtract' as const, label: '− Çıkar', symbol: '−' },
    { type: 'multiply' as const, label: '× Çarp', symbol: '×' },
    { type: 'divide' as const, label: '÷ Böl', symbol: '÷' },
  ];

  return (
    <div className="space-y-3">
      {/* İşlem seçici (Siyah-Beyaz Çizim Butonları) */}
      <div className="grid grid-cols-4 gap-1.5">
        {ops.map(op => {
          const isSelected = opType === op.type;
          return (
            <button
              key={op.type}
              type="button"
              onClick={() => setOpType(op.type)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border-2 border-zinc-900 transition-all ${
                isSelected
                  ? 'bg-zinc-900 text-white shadow-[2px_2px_0px_#18181b]'
                  : 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-[1px_1px_0px_#18181b]'
              }`}
            >
              {op.symbol} {op.label.split(' ')[1]}
            </button>
          );
        })}
      </div>

      {/* Terim Tipi (Sabit Sayı vs x'li Terim) */}
      {(opType === 'add' || opType === 'subtract') && (
        <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-xl border-2 border-zinc-900">
          <button
            type="button"
            onClick={() => setIsVariable(false)}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
              !isVariable ? 'bg-zinc-900 text-white shadow' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            🔢 Sayı ({value})
          </button>
          <button
            type="button"
            onClick={() => setIsVariable(true)}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
              isVariable ? 'bg-zinc-900 text-white shadow' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            📦 x Terimi ({value === 1 ? 'x' : `${value}x`})
          </button>
        </div>
      )}

      {/* Değer girişi & Uygula */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const v = Math.max(1, value - 1);
              setValue(v);
              setInputVal(String(v));
            }}
            className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-white flex items-center justify-center text-sm font-bold hover:bg-zinc-100 active:scale-95 shadow-[1px_1px_0px_#18181b]"
          >
            −
          </button>

          <input
            type="number"
            value={inputVal}
            onChange={e => {
              setInputVal(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) setValue(Math.max(1, n));
            }}
            className="w-14 text-center py-1 rounded-lg font-mono font-bold text-xs text-zinc-900 bg-white border-2 border-zinc-900 outline-none"
            min={1}
            max={99}
          />

          <button
            type="button"
            onClick={() => {
              const v = value + 1;
              setValue(v);
              setInputVal(String(v));
            }}
            className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-white flex items-center justify-center text-sm font-bold hover:bg-zinc-100 active:scale-95 shadow-[1px_1px_0px_#18181b]"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onApply(opType, value, isVariable)}
          disabled={disabled || value === 0}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 text-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50"
        >
          Her İki Kefeye {opType === 'add' ? '+' : opType === 'subtract' ? '−' : opType === 'multiply' ? '×' : '÷'}
          {isVariable ? (value === 1 ? ' x' : ` ${value}x`) : ` ${value}`}
        </button>
      </div>
    </div>
  );
}

export default function AlgebraGame() {
  const { setCurrentGame, recordGameResult, playSound } = useAppStore();
  const [difficulty, setDifficulty] = useState<Difficulty>('kolay');
  const [gameMode, setGameMode] = useState<GameMode>('zen');

  // Rush modu durumları
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('cebir_rush_highscore') || '0', 10);
  });
  const [isRushGameOver, setIsRushGameOver] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() => {
    const eq = generateEquation('kolay');
    return {
      equation: eq,
      currentEq: eq,
      solved: false,
      steps: [equationToString(eq)],
      hintsUsed: 0,
      startTime: Date.now(),
      score: 0,
    };
  });

  const [studentAnswer, setStudentAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'hint' | 'info'; message: string } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showManualOps, setShowManualOps] = useState(false);
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSparkles = useCallback(() => {
    const symbols = ['✦', '★', '⚖️', 'x', '✓', '✨'];
    const colors = ['#2563eb', '#f59e0b', '#059669', '#18181b'];
    const newSparkles: SparkleParticle[] = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 260,
      y: -Math.random() * 120 - 20,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1600);
  }, []);

  const startNewGame = useCallback(() => {
    const eq = generateEquation(difficulty);
    setGameState({
      equation: eq,
      currentEq: eq,
      solved: false,
      steps: [equationToString(eq)],
      hintsUsed: 0,
      startTime: Date.now(),
      score: 0,
    });
    setStudentAnswer('');
    setFeedback(null);
    setShowSolution(false);
  }, [difficulty]);

  // Zorluk değiştiğinde yeni oyun
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Rush Modu Zaman Sayacı
  useEffect(() => {
    if (gameMode !== 'rush' || isRushGameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsRushGameOver(true);
          playSound('wrong');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameMode, isRushGameOver, playSound]);

  const restartRush = () => {
    setTimeLeft(60);
    setStreak(0);
    setIsRushGameOver(false);
    setProblemsSolved(0);
    startNewGame();
  };

  const solution = solveLinearEquation(gameState.equation);
  const tiltAngle = calculateTiltAngle(gameState.currentEq, solution);
  const stageInfo = getEquationStage(gameState.currentEq);
  const recommendedOps = getRecommendedOperations(gameState.currentEq);

  function handleOperation(type: 'add' | 'subtract' | 'multiply' | 'divide', value: number, isVar?: boolean) {
    if (gameState.solved || (gameMode === 'rush' && isRushGameOver)) return;

    const result = applyOperation(gameState.currentEq, {
      type,
      value,
      isVariable: isVar,
      applyTo: 'both',
    });

    if (!result.isValid) {
      playSound('wrong');
      setFeedback({ type: 'error', message: result.errorMessage || 'Geçersiz işlem' });
      return;
    }

    playSound('move');
    const updatedEq = result.newEq || result.newEquation;
    const newSteps = [...gameState.steps, equationToString(updatedEq)];

    setGameState(prev => ({
      ...prev,
      currentEq: updatedEq,
      steps: newSteps,
    }));

    // Otomatik izolasyon kontrolü
    const newStage = getEquationStage(updatedEq);
    if (newStage.isIsolated && newStage.isolatedValue !== undefined) {
      // x yalnız kaldı!
      const correctVal = solution.numerator / solution.denominator;
      if (Math.abs(newStage.isolatedValue - correctVal) < 1e-10) {
        handleSolvedSuccess(newStage.isolatedValue);
        return;
      }
    }

    setFeedback({
      type: 'info',
      message: `${type === 'add' ? '+' : type === 'subtract' ? '−' : type === 'multiply' ? '×' : '÷'}${
        isVar ? (value === 1 ? 'x' : `${value}x`) : value
      } her iki kefeye uygulandı. Eşitlik korundu!`,
    });
  }

  function handleSolvedSuccess(val: number) {
    playSound('win');
    triggerSparkles();

    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const basePoints = Math.max(20, 100 - gameState.hintsUsed * 20 - Math.floor(elapsed / 8));
    const streakBonus = streak * 15;
    const totalPoints = basePoints + streakBonus;

    setGameState(prev => ({ ...prev, solved: true, score: totalPoints }));
    setProblemsSolved(n => n + 1);

    if (gameMode === 'rush') {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setTimeLeft(t => Math.min(90, t + 10)); // +10 sn bonus süre

      const newScore = (problemsSolved + 1) * 100 + nextStreak * 50;
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('cebir_rush_highscore', String(newScore));
      }
    }

    setFeedback({
      type: 'success',
      message: `Tebrikler! x = ${val} bulundu! Terazi mükemmel dengede ✓`,
    });

    recordGameResult('algebra', true, totalPoints, elapsed);
  }

  function handleCheckAnswer() {
    if (gameState.solved || !studentAnswer || (gameMode === 'rush' && isRushGameOver)) return;
    const num = parseFloat(studentAnswer);
    if (isNaN(num)) return;

    const validation = validateStudentAnswer(gameState.equation, num);

    if (validation.isCorrect) {
      handleSolvedSuccess(num);
    } else {
      playSound('wrong');
      if (gameMode === 'rush') {
        setStreak(0);
        setTimeLeft(t => Math.max(5, t - 5)); // -5 sn hata cezası
      }
      setFeedback({
        type: 'error',
        message: validation.explanation,
      });
    }
  }

  function handleHint() {
    playSound('hint');
    const steps = generateSolutionSteps(gameState.currentEq);
    if (steps.length > 0) {
      const hint = steps[0].description;
      setGameState(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      setFeedback({ type: 'hint', message: `💡 İpucu: ${hint}` });
    }
  }

  const leftStr = formatSide(gameState.currentEq.leftA, gameState.currentEq.leftB);
  const rightStr = formatSide(gameState.currentEq.rightA, gameState.currentEq.rightB);

  // Kefe üzerindeki nesnelere doğrudan tıklama eylemleri
  const handlePanItemClick = (type: 'x' | 'constant', side: 'left' | 'right') => {
    if (gameState.solved) return;

    if (type === 'x') {
      // Eğer tıklanan kefede x varsa, her iki kefeden 1x (veya bu miktarda) çıkar
      const count = side === 'left' ? gameState.currentEq.leftA : gameState.currentEq.rightA;
      if (count > 0) {
        handleOperation('subtract', 1, true);
      }
    } else {
      // Sabit sayıya tıklandı
      const constVal = side === 'left' ? gameState.currentEq.leftB : gameState.currentEq.rightB;
      if (constVal > 0) {
        handleOperation('subtract', constVal, false);
      } else if (constVal < 0) {
        handleOperation('add', Math.abs(constVal), false);
      }
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b-2 border-zinc-900 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => setCurrentGame(null)} className="sketch-btn text-xs font-bold">
            ← Ana Sayfa
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h1 className="text-base font-extrabold text-zinc-900 font-mono tracking-wide">CEBİR TERAZİSİ</h1>
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
                🧘‍♀️ Laboratuvar
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
                ⚡ Denge Rush
              </button>
            </div>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-white font-bold text-xs flex items-center justify-center shadow-[1px_1px_0px_#18181b]"
              title="Nasıl Oynanır?"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      {/* Rush Modu Durum Şeridi */}
      {gameMode === 'rush' && (
        <div className="bg-amber-100/90 border-b-2 border-zinc-900 py-2 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs font-mono font-bold">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded border border-zinc-900 ${timeLeft <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-zinc-900'}`}>
                ⏱️ Kalan: {timeLeft}s
              </span>
              {streak > 1 && (
                <span className="px-2 py-0.5 rounded border border-zinc-900 bg-amber-400 text-zinc-950 font-black animate-bounce">
                  🔥 {streak}x Kombo Serisi!
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-700">Çözülen: {problemsSolved}</span>
              <span className="text-amber-900">En Yüksek Skor: {highScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 p-4 rounded-xl max-w-4xl mx-auto border-2 border-zinc-900 bg-white shadow-[3px_3px_0px_#18181b]"
          >
            <h3 className="font-bold text-zinc-900 mb-1.5 text-sm flex items-center gap-2">
              <span>📖 Cebir Terazisi Kuralları:</span>
            </h3>
            <ul className="text-xs text-zinc-700 space-y-1.5">
              <li>
                • <strong>Denklik Kuralı:</strong> Terazi dengededir. Bir kefeye ne yaparsan, diğer kefeye de aynısını yapmalısın!
              </li>
              <li>
                • <strong>Tıklayarak Hamle:</strong> Kefedeki mavi [x] kutusuna veya sarı ağırlığa tıklayarak her iki kefeden aynı ağırlığı anında çıkarabilirsin!
              </li>
              <li>
                • <strong>Akıllı Hızlı Hamleler:</strong> Terazinin hemen altındaki önerilen butonlara tek tıkla basarak hızlıca x'i yalnız bırakabilirsin.
              </li>
              <li>
                • <strong>Hedef:</strong> Bir kefede sadece 1 tane x, diğer kefede sadece sayı kalsın: <code>x = ?</code>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* Zorluk & Yeni Denklem */}
        <div className="flex items-center justify-between flex-wrap gap-3">
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
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded border border-zinc-900 bg-zinc-100">
              {problemsSolved} Çözüldü
            </span>
            <button type="button" onClick={startNewGame} className="sketch-btn text-xs font-bold">
              🔄 Yeni Denklem
            </button>
          </div>
        </div>

        {/* Görev & x'i Kurtarma İlerlemesi */}
        <div className="paper-card !py-3 !px-4">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase font-mono text-zinc-800">
                {stageInfo.stageName}
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-zinc-900 bg-zinc-50">
              %{stageInfo.progressPercent} Tamamlandı
            </span>
          </div>

          {/* Progress Bar (Pencil Hatched Style) */}
          <div className="w-full h-3 rounded-full border-2 border-zinc-900 bg-zinc-100 overflow-hidden relative">
            <motion.div
              className="h-full bg-zinc-900"
              initial={{ width: 0 }}
              animate={{ width: `${stageInfo.progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 18 }}
            />
          </div>

          <div className="mt-2 text-xs text-zinc-600 font-medium flex items-center justify-between flex-wrap gap-1">
            <span>🎯 <strong>Hedef:</strong> {stageInfo.nextGoal}</span>
            <span className="text-[11px] text-zinc-500 font-mono">
              (İpucu: Kefedeki nesnelere veya alttaki hızlı hamlelere tıkla)
            </span>
          </div>
        </div>

        {/* 2D Karakalem Terazi Alanı (Spring Wobble Physics + Tıklanabilir Kefeler) */}
        <div className="paper-card relative overflow-hidden">
          {/* Confetti / Sparkle Parıltıları */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {sparkles.map(p => (
              <motion.span
                key={p.id}
                initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                animate={{ opacity: 0, scale: 1.8, x: p.x, y: p.y }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute text-xl font-bold select-none"
                style={{ color: p.color }}
              >
                {p.symbol}
              </motion.span>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Mevcut Durum:</span>
              <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-zinc-50 font-mono font-extrabold text-sm text-zinc-900 shadow-[2px_2px_0px_#18181b]">
                {equationToString(gameState.currentEq)}
              </span>
            </div>

            <div
              className={`px-3 py-1 rounded-lg border-2 text-xs font-bold font-mono transition-colors ${
                Math.abs(tiltAngle) < 1
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-[2px_2px_0px_#059669]'
                  : 'border-rose-600 bg-rose-50 text-rose-800 shadow-[2px_2px_0px_#e11d48]'
              }`}
            >
              {Math.abs(tiltAngle) < 1 ? '✓ KEFELER DENGEDE' : '≠ DENGESİZ'}
            </div>
          </div>

          {/* SVG Çizim Terazi */}
          <div className="flex justify-center py-3 bg-zinc-50/60 rounded-xl border-2 border-dashed border-zinc-300 relative select-none">
            <svg width="100%" height="280" viewBox="0 0 640 280" className="max-w-2xl">
              {/* Zemin Kaidesi */}
              <ellipse cx="320" cy="262" rx="84" ry="10" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />
              <rect x="313" y="65" width="14" height="195" rx="3" fill="#ffffff" stroke="#18181b" strokeWidth="2" />

              {/* Destek Üçgeni */}
              <polygon points="305,262 335,262 320,185" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

              {/* Dönen Terazi Kolu (Spring Animasyonu) */}
              <g transform="translate(320, 70)">
                <motion.g
                  animate={{ rotate: Math.max(-20, Math.min(20, tiltAngle)) }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14, mass: 1 }}
                >
                  {/* Ana Kiriş (Karakalem hat) */}
                  <rect x="-250" y="-4" width="500" height="8" rx="4" fill="#18181b" stroke="#18181b" strokeWidth="1" />

                  {/* Merkez Mafsal */}
                  <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="4" fill="#18181b" />

                  {/* İbre (Denge Göstergesi) */}
                  <polygon
                    points="-2,0 2,0 0,-42"
                    fill={Math.abs(tiltAngle) < 1 ? '#059669' : '#e11d48'}
                    stroke="#18181b"
                    strokeWidth="1"
                  />

                  {/* SOL KEFE ASKI VE TABAK */}
                  <line x1="-200" y1="4" x2="-200" y2="78" stroke="#18181b" strokeWidth="2" strokeDasharray="4 2" />
                  <g transform="translate(-200, 78)">
                    <ellipse cx="0" cy="0" rx="74" ry="15" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />

                    {/* Sol Kefe Nesneleri */}
                    <g transform="translate(0, -18)">
                      {/* x Kutuları (Mavi koli - Tıklanabilir) */}
                      {Array.from({ length: Math.min(6, Math.max(0, gameState.currentEq.leftA)) }, (_, idx) => {
                        const total = Math.min(6, gameState.currentEq.leftA);
                        const xOffset = -total * 13 + idx * 26 + 13;
                        return (
                          <g
                            key={`l-box-${idx}`}
                            transform={`translate(${xOffset}, -8)`}
                            className="cursor-pointer transition-transform hover:scale-110"
                            onClick={() => handlePanItemClick('x', 'left')}
                          >
                            <title>Kefelerden 1x Eksilt</title>
                            <rect
                              x="-11"
                              y="-11"
                              width="22"
                              height="22"
                              rx="4"
                              fill="#2563eb"
                              stroke="#18181b"
                              strokeWidth="2"
                            />
                            <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                              x
                            </text>
                          </g>
                        );
                      })}

                      {/* Sabit birim sayı etiketi (Sarı sikke - Tıklanabilir) */}
                      {gameState.currentEq.leftB !== 0 && (
                        <g
                          transform="translate(0, 14)"
                          className="cursor-pointer transition-transform hover:scale-110"
                          onClick={() => handlePanItemClick('constant', 'left')}
                        >
                          <title>Bu sayıyı her iki taraftan temizle</title>
                          <circle cx="0" cy="0" r="13" fill="#f59e0b" stroke="#18181b" strokeWidth="2" />
                          <text x="0" y="4.5" textAnchor="middle" fill="#18181b" fontSize="11" fontWeight="bold">
                            {gameState.currentEq.leftB > 0 ? `+${gameState.currentEq.leftB}` : `${gameState.currentEq.leftB}`}
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Sol Kefe Değeri */}
                    <text x="0" y="32" textAnchor="middle" fill="#18181b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                      Sol: {leftStr}
                    </text>
                  </g>

                  {/* SAĞ KEFE ASKI VE TABAK */}
                  <line x1="200" y1="4" x2="200" y2="78" stroke="#18181b" strokeWidth="2" strokeDasharray="4 2" />
                  <g transform="translate(200, 78)">
                    <ellipse cx="0" cy="0" rx="74" ry="15" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />

                    {/* Sağ Kefe Nesneleri */}
                    <g transform="translate(0, -18)">
                      {/* x Kutuları (Tıklanabilir) */}
                      {Array.from({ length: Math.min(6, Math.max(0, gameState.currentEq.rightA)) }, (_, idx) => {
                        const total = Math.min(6, gameState.currentEq.rightA);
                        const xOffset = -total * 13 + idx * 26 + 13;
                        return (
                          <g
                            key={`r-box-${idx}`}
                            transform={`translate(${xOffset}, -8)`}
                            className="cursor-pointer transition-transform hover:scale-110"
                            onClick={() => handlePanItemClick('x', 'right')}
                          >
                            <title>Kefelerden 1x Eksilt</title>
                            <rect
                              x="-11"
                              y="-11"
                              width="22"
                              height="22"
                              rx="4"
                              fill="#2563eb"
                              stroke="#18181b"
                              strokeWidth="2"
                            />
                            <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                              x
                            </text>
                          </g>
                        );
                      })}

                      {/* Sabit birim sayı etiketi (Tıklanabilir) */}
                      {gameState.currentEq.rightB !== 0 && (
                        <g
                          transform="translate(0, 14)"
                          className="cursor-pointer transition-transform hover:scale-110"
                          onClick={() => handlePanItemClick('constant', 'right')}
                        >
                          <title>Bu sayıyı her iki taraftan temizle</title>
                          <circle cx="0" cy="0" r="13" fill="#f59e0b" stroke="#18181b" strokeWidth="2" />
                          <text x="0" y="4.5" textAnchor="middle" fill="#18181b" fontSize="11" fontWeight="bold">
                            {gameState.currentEq.rightB > 0 ? `+${gameState.currentEq.rightB}` : `${gameState.currentEq.rightB}`}
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Sağ Kefe Değeri */}
                    <text x="0" y="32" textAnchor="middle" fill="#18181b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                      Sağ: {rightStr}
                    </text>
                  </g>
                </motion.g>
              </g>
            </svg>
          </div>

          {/* AKILLI HIZLI HAMLELER (En Heyecanlı Hızlı Aksiyon Çipleri) */}
          <div className="mt-4 pt-3 border-t-2 border-dashed border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5 font-mono">
                <span>⚡</span> Akıllı Denge Hamleleri:
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">Tek tıkla her iki kefeye uygula</span>
            </div>

            {stageInfo.isIsolated && stageInfo.isolatedValue !== undefined ? (
              <button
                type="button"
                onClick={() => handleSolvedSuccess(stageInfo.isolatedValue!)}
                disabled={gameState.solved}
                className="w-full py-3 px-4 rounded-xl font-bold bg-emerald-600 text-white border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] text-sm animate-pulse flex items-center justify-center gap-2"
              >
                <span>🎯</span> x = {stageInfo.isolatedValue} Tamamlandı! Teraziyi Onayla (Tam Puan)
              </button>
            ) : recommendedOps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recommendedOps.map((op: QuickAction, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleOperation(op.type, op.value, op.isVariable)}
                    disabled={gameState.solved}
                    className="p-2.5 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-left transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded border border-zinc-900 bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        {op.badge}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Her İki Kefeden</span>
                    </div>
                    <div className="text-xs font-bold text-zinc-900 truncate">{op.label}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{op.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 font-mono text-center py-1">
                Önerilen işlem yok. Manuel işlem yapabilir veya x değerini doğrudan girebilirsiniz.
              </div>
            )}
          </div>
        </div>

        {/* Kontrol Alanı (Manuel İşlemler, Çözüm Testi ve Adım Geçmişi) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sol Kolon: Doğrudan Cevap & Manuel İşlemler */}
          <div className="space-y-4">
            {/* Hızlı Çözüm Girişi */}
            <div className="paper-card">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 font-mono">
                Cevabı Biliyor musun? Doğrudan Gir:
              </h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={studentAnswer}
                  onChange={e => setStudentAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheckAnswer()}
                  placeholder="x = ?"
                  className="flex-1 px-3 py-2 rounded-xl font-mono font-bold text-zinc-900 bg-white border-2 border-zinc-900 outline-none text-base"
                  disabled={gameState.solved || (gameMode === 'rush' && isRushGameOver)}
                />
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={gameState.solved || !studentAnswer || (gameMode === 'rush' && isRushGameOver)}
                  className="sketch-btn-dark px-5 text-sm font-bold"
                >
                  Doğrula ✓
                </button>
              </div>
            </div>

            {/* Manuel İşlem Akordeonu */}
            <div className="paper-card">
              <button
                type="button"
                onClick={() => setShowManualOps(!showManualOps)}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-800 uppercase font-mono"
              >
                <span>🛠️ Özel / Manuel İşlem Paneli</span>
                <span>{showManualOps ? '▲ Gizle' : '▼ Aç'}</span>
              </button>

              {showManualOps && (
                <div className="mt-3 pt-3 border-t-2 border-dashed border-zinc-200">
                  <OperationPanel
                    onApply={handleOperation}
                    disabled={gameState.solved || (gameMode === 'rush' && isRushGameOver)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sağ Kolon: Adımlar, İpuçları ve Çözüm */}
          <div className="space-y-4">
            <div className="paper-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-500 font-mono">BAŞLANGIÇ:</span>
                <span className="font-mono text-sm font-extrabold text-zinc-900">
                  {equationToString(gameState.equation)}
                </span>
              </div>

              {gameState.steps.length > 1 && (
                <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  <div className="text-[11px] text-zinc-500 font-bold uppercase font-mono">Denklik Adımları:</div>
                  {gameState.steps.map((step, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-between text-zinc-800"
                    >
                      <span className="text-zinc-500 font-bold">{i + 1}. Adım:</span>
                      <span className="font-bold">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* İpucu & Çözüm Butonları */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleHint}
                disabled={gameState.solved || (gameMode === 'rush' && isRushGameOver)}
                className="sketch-btn flex-1 text-xs font-bold"
              >
                💡 İpucu Al ({gameState.hintsUsed})
              </button>

              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className="sketch-btn flex-1 text-xs font-bold"
              >
                {showSolution ? '🙈 Çözümü Gizle' : '📖 Adım Adım Çözüm'}
              </button>
            </div>

            {/* Çözüm Çekmecesi */}
            <AnimatePresence>
              {showSolution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl overflow-hidden border-2 border-zinc-900 bg-zinc-50 p-4 shadow-[2px_2px_0px_#18181b]"
                >
                  <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 font-mono">
                    Matematiksel Çözüm:
                  </div>
                  {generateSolutionSteps(gameState.equation).map((step, i) => (
                    <div key={i} className="flex gap-2 text-xs mb-1.5">
                      <span className="font-bold text-zinc-900">{i + 1}.</span>
                      <div>
                        <span className="text-zinc-700">{step.description}: </span>
                        <span className="font-mono font-bold text-zinc-900">
                          {step.leftSide} = {step.rightSide}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-zinc-300 text-xs font-bold text-emerald-700 font-mono">
                    Doğru Çözüm: x = {fractionToString(solution)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Geri Bildirim */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
              {feedback.type === 'success' && '✅ '}
              {feedback.type === 'error' && '❌ '}
              {feedback.type === 'hint' && '💡 '}
              {feedback.type === 'info' && 'ℹ️ '}
              <span className="font-medium text-xs">{feedback.message}</span>
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
              Toplam Çözülen: {problemsSolved} denklem | En Yüksek Skor: {highScore}
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

        {/* Başarı Durumu (Zen Modu veya Rush devam ederken) */}
        <AnimatePresence>
          {gameState.solved && !isRushGameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="paper-card text-center py-6 border-2 border-emerald-600 bg-emerald-50/50 shadow-[4px_4px_0px_#059669]"
            >
              <div className="text-3xl mb-1">🎉</div>
              <h2 className="text-xl font-black text-emerald-900 mb-1">Harika İş!</h2>
              <p className="text-zinc-700 text-sm font-bold mb-3">
                x = {fractionToString(solution)} bulundu! Puan: +{gameState.score}
                {gameMode === 'rush' && streak > 1 && ` (+${streak * 15} kombo bonusu!)`}
              </p>
              <button
                type="button"
                onClick={startNewGame}
                className="sketch-btn-dark px-6 py-2.5 text-sm font-bold"
              >
                Sonraki Denklem →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
