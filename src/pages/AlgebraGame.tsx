import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isTilting, setIsTilting] = useState(false);
  const [tiltStatus, setTiltStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [opMode, setOpMode] = useState<'balanced' | 'free'>('balanced');
  const [floatingTokens, setFloatingTokens] = useState<
    Array<{
      id: number;
      side: 'left' | 'right';
      text: string;
      type: 'add' | 'subtract' | 'multiply' | 'divide';
    }>
  >([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tiltTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tiltSecondTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    setTiltAngle(0);
    setIsTilting(false);
    setTiltStatus(null);
    setFloatingTokens([]);
    if (tiltTimerRef.current) clearTimeout(tiltTimerRef.current);
    if (tiltSecondTimerRef.current) clearTimeout(tiltSecondTimerRef.current);
  }, [difficulty]);

  // Zorluk değiştiğinde yeni oyun
  useEffect(() => {
    startNewGame();
    return () => {
      if (tiltTimerRef.current) clearTimeout(tiltTimerRef.current);
      if (tiltSecondTimerRef.current) clearTimeout(tiltSecondTimerRef.current);
    };
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
  const stageInfo = getEquationStage(gameState.currentEq);
  const recommendedOps = getRecommendedOperations(gameState.currentEq);

  const solutionX = solution.denominator === 1 && solution.numerator > 0 ? solution.numerator : 3;
  const effectiveXWeight = Math.max(1, solutionX);

  const baseLeftItems = useMemo<PanItem[]>(() => {
    const items: PanItem[] = [];
    for (let i = 0; i < Math.max(0, gameState.currentEq.leftA); i++) {
      items.push({ id: `l-x-${i}`, type: 'x', value: 1, label: 'x' });
    }
    items.push(...decomposeConstantToWeights(gameState.currentEq.leftB, 'left'));
    return items;
  }, [gameState.currentEq.leftA, gameState.currentEq.leftB]);

  const baseRightItems = useMemo<PanItem[]>(() => {
    const items: PanItem[] = [];
    for (let i = 0; i < Math.max(0, gameState.currentEq.rightA); i++) {
      items.push({ id: `r-x-${i}`, type: 'x', value: 1, label: 'x' });
    }
    items.push(...decomposeConstantToWeights(gameState.currentEq.rightB, 'right'));
    return items;
  }, [gameState.currentEq.rightA, gameState.currentEq.rightB]);

  const activeLeftItems = baseLeftItems;
  const activeRightItems = baseRightItems;

  const currentLeftMass = useMemo(() => {
    return activeLeftItems.reduce(
      (acc, it) => acc + (it.type === 'x' ? effectiveXWeight : it.value),
      0
    );
  }, [activeLeftItems, effectiveXWeight]);

  const currentRightMass = useMemo(() => {
    return activeRightItems.reduce(
      (acc, it) => acc + (it.type === 'x' ? effectiveXWeight : it.value),
      0
    );
  }, [activeRightItems, effectiveXWeight]);

  function addFloatingToken(
    side: 'left' | 'right',
    text: string,
    type: 'add' | 'subtract' | 'multiply' | 'divide'
  ) {
    const id = Date.now() + Math.random();
    setFloatingTokens(prev => [...prev, { id, side, text, type }]);
    setTimeout(() => {
      setFloatingTokens(prev => prev.filter(t => t.id !== id));
    }, 1000);
  }

  function handleOperation(
    type: 'add' | 'subtract' | 'multiply' | 'divide',
    value: number,
    isVar?: boolean,
    triggerSide: 'left' | 'right' = 'left'
  ) {
    if (gameState.solved || (gameMode === 'rush' && isRushGameOver) || isTilting) return;

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

    const opSymbol = type === 'add' ? '+' : type === 'subtract' ? '−' : type === 'multiply' ? '×' : '÷';
    const opLabel = `${opSymbol}${isVar ? (value === 1 ? 'x' : `${value}x`) : value}`;

    setIsTilting(true);

    // ADIM 1: İlk Kefe Fiziksel Olarak Değişir (Terazi Eğilir!)
    // Çıkarıldığında veya bölündüğünde kefe hafifler -> yukarı kalkar.
    // Eklendiğinde veya çarpıldığında kefe ağırlaşır -> aşağı çöker.
    let dipAngle = 0;
    if (type === 'subtract' || type === 'divide') {
      dipAngle = triggerSide === 'left' ? 16 : -16;
    } else {
      dipAngle = triggerSide === 'left' ? -16 : 16;
    }

    playSound('move');
    addFloatingToken(triggerSide, opLabel, type);
    setTiltAngle(dipAngle);
    const actionDesc =
      type === 'subtract' || type === 'divide'
        ? `${triggerSide === 'left' ? 'Sol' : 'Sağ'} kefe hafifledi (Yukarı Kalktı ↗)`
        : `${triggerSide === 'left' ? 'Sol' : 'Sağ'} kefe ağırlaştı (Aşağı İndi ↘)`;
    setTiltStatus(actionDesc);

    // ADIM 2 (400ms sonra): İkinci kefe de aynı işlemi alır, terazi dengeye doğru salınır
    tiltTimerRef.current = setTimeout(() => {
      const otherSide = triggerSide === 'left' ? 'right' : 'left';
      addFloatingToken(otherSide, opLabel, type);
      playSound('move');

      // Karşı kefe eşitlenir, terazi spring ile salınarak 0'a gelir
      setTiltAngle(0);
      setTiltStatus('Karşı kefe eşitleniyor...');

      const updatedEq = result.newEq || result.newEquation;
      const newSteps = [...gameState.steps, equationToString(updatedEq)];

      setGameState(prev => ({
        ...prev,
        currentEq: updatedEq,
        steps: newSteps,
      }));

      // ADIM 3 (450ms sonra): Denge tamamen yerine oturur
      tiltSecondTimerRef.current = setTimeout(() => {
        setIsTilting(false);
        setTiltStatus(null);
        playSound('click');

        // Otomatik izolasyon kontrolü
        const newStage = getEquationStage(updatedEq);
        if (newStage.isIsolated && newStage.isolatedValue !== undefined) {
          const correctVal = solution.numerator / solution.denominator;
          if (Math.abs(newStage.isolatedValue - correctVal) < 1e-10) {
            handleSolvedSuccess(newStage.isolatedValue);
            return;
          }
        }

        setFeedback({
          type: 'info',
          message: `${opLabel} her iki kefeye uygulandı: Terazi tekrar tam dengede ✓`,
        });
      }, 450);
    }, 400);
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

  // Kefeden Nesne Alma (Kaldırma / Eksiltme)
  const handleRemoveItem = (side: 'left' | 'right', type: 'x' | 'constant', value: number) => {
    if (gameState.solved || (gameMode === 'rush' && isRushGameOver) || isTilting) return;

    if (opMode === 'balanced') {
      // ⚡ Akıllı Denge Modu: Cebirsel denklik korunarak her iki kefeden eşit miktarda eksiltilir
      if (type === 'x') {
        const canSubtract = gameState.currentEq.leftA >= 1 && gameState.currentEq.rightA >= 1;
        if (canSubtract) {
          handleOperation('subtract', 1, true, side);
        } else {
          playSound('wrong');
          setFeedback({
            type: 'info',
            message: `Karşı kefede x kutusu kalmadığı için x çıkarılamaz. Hedef x'i yalnız bırakmak!`,
          });
        }
      } else {
        // Sabit sayı eksiltme
        const currentThisB = side === 'left' ? gameState.currentEq.leftB : gameState.currentEq.rightB;
        const currentOtherB = side === 'left' ? gameState.currentEq.rightB : gameState.currentEq.leftB;

        if (currentOtherB <= 0) {
          playSound('wrong');
          setFeedback({
            type: 'info',
            message: `Karşı kefede pozitif sayı kalmadığı için çıkarma yapılamaz. Hedef x'i yalnız bırakmak!`,
          });
          return;
        }

        const subVal = Math.min(value, currentOtherB, currentThisB);
        if (subVal > 0) {
          handleOperation('subtract', subVal, false, side);
        }
      }
    } else {
      // 🖐️ Serbest Kefe Modu: Sadece tıklanan kefeden eksiltilir, terazi hemen gerçek fiziksel ağırlık farkına göre eğilir!
      const isLeft = side === 'left';
      let nextLeftA = gameState.currentEq.leftA;
      let nextLeftB = gameState.currentEq.leftB;
      let nextRightA = gameState.currentEq.rightA;
      let nextRightB = gameState.currentEq.rightB;

      if (type === 'x') {
        if (isLeft) nextLeftA = Math.max(0, nextLeftA - 1);
        else nextRightA = Math.max(0, nextRightA - 1);
      } else {
        if (isLeft) nextLeftB = Math.max(0, nextLeftB - value);
        else nextRightB = Math.max(0, nextRightB - value);
      }

      const nextEq: Equation = {
        leftA: nextLeftA,
        leftB: nextLeftB,
        rightA: nextRightA,
        rightB: nextRightB,
      };

      playSound('move');
      addFloatingToken(side, `−${type === 'x' ? '1x' : value}`, 'subtract');

      setGameState(prev => ({
        ...prev,
        currentEq: nextEq,
        steps: [...prev.steps, `[Serbest] ${side === 'left' ? 'Sol' : 'Sağ'} kefeden −${type === 'x' ? '1x' : value}`],
      }));

      // Serbest modda denge kontrolü
      const newLeftMass = nextLeftA * effectiveXWeight + nextLeftB;
      const newRightMass = nextRightA * effectiveXWeight + nextRightB;
      if (newLeftMass === newRightMass) {
        playSound('win');
        setFeedback({
          type: 'success',
          message: `🎉 Tebrikler! Kefeleri tam olarak eşitledin (${newLeftMass} br = ${newRightMass} br). Terazi tam dengede!`,
        });
      } else {
        const heavier = newLeftMass > newRightMass ? 'Sol kefe ağır bastı ↘' : 'Sağ kefe ağır bastı ↘';
        setFeedback({
          type: 'info',
          message: `Kefeden ${type === 'x' ? '1x' : value} eksiltildi. ${heavier}`,
        });
      }
    }
  };

  // Kefeye Yeni Ağırlık / x Koyma (Ekleme)
  const handleAddItem = (side: 'left' | 'right', type: 'x' | 'constant', value: number) => {
    if (gameState.solved || (gameMode === 'rush' && isRushGameOver) || isTilting) return;

    if (opMode === 'balanced') {
      // ⚡ Akıllı Denge Modu: Her iki tarafa da ekler ve teraziyi önce eğip sonra dengeler
      handleOperation('add', value, type === 'x', side);
    } else {
      // 🖐️ Serbest Kefe Modu: Sadece seçilen kefeye ekler, terazi anında o kefeye doğru çöker!
      const isLeft = side === 'left';
      let nextLeftA = gameState.currentEq.leftA;
      let nextLeftB = gameState.currentEq.leftB;
      let nextRightA = gameState.currentEq.rightA;
      let nextRightB = gameState.currentEq.rightB;

      if (type === 'x') {
        if (isLeft) nextLeftA += 1;
        else nextRightA += 1;
      } else {
        if (isLeft) nextLeftB += value;
        else nextRightB += value;
      }

      const nextEq: Equation = {
        leftA: nextLeftA,
        leftB: nextLeftB,
        rightA: nextRightA,
        rightB: nextRightB,
      };

      playSound('move');
      addFloatingToken(side, `+${type === 'x' ? '1x' : value}`, 'add');

      setGameState(prev => ({
        ...prev,
        currentEq: nextEq,
        steps: [...prev.steps, `[Serbest] ${side === 'left' ? 'Sol' : 'Sağ'} kefeye +${type === 'x' ? '1x' : value}`],
      }));

      // Serbest modda denge kontrolü
      const newLeftMass = nextLeftA * effectiveXWeight + nextLeftB;
      const newRightMass = nextRightA * effectiveXWeight + nextRightB;
      if (newLeftMass === newRightMass) {
        playSound('win');
        setFeedback({
          type: 'success',
          message: `🎉 Harika! Kefeler tam eşitlendi (${newLeftMass} br = ${newRightMass} br). Terazi tam dengede!`,
        });
      } else {
        const heavier = newLeftMass > newRightMass ? 'Sol kefe ağır bastı ↘' : 'Sağ kefe ağır bastı ↘';
        setFeedback({
          type: 'info',
          message: `${side === 'left' ? 'Sol' : 'Sağ'} kefeye ${type === 'x' ? '1x' : value} eklendi. ${heavier}`,
        });
      }
    }
  };

  // 3B Kefeden Tıklayarak Nesne Alma (Eksiltme)
  const handle3DItemClick = (side: 'left' | 'right', item: PanItem) => {
    handleRemoveItem(side, item.type, item.value);
  };

  // 2B Mod veya Kefe Tıklaması
  const handlePanItemClick = (type: 'x' | 'constant', side: 'left' | 'right') => {
    if (gameState.solved || isTilting) return;
    if (type === 'x') {
      handleRemoveItem(side, 'x', 1);
    } else {
      const constVal = side === 'left' ? gameState.currentEq.leftB : gameState.currentEq.rightB;
      if (constVal > 0) {
        handleRemoveItem(side, 'constant', Math.min(2, constVal));
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

            {/* Görünüm Seçimi (3B Realist vs 2B Çizim) */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg border-2 border-zinc-900 bg-zinc-100">
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1 rounded-md text-xs font-bold font-mono transition-all ${
                  viewMode === '3d'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
              >
                🧭 3B Realist
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1 rounded-md text-xs font-bold font-mono transition-all ${
                  viewMode === '2d'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-700 hover:text-zinc-900'
                }`}
              >
                ✏️ 2B Çizim
              </button>
            </div>

            <motion.div
              layout
              className={`px-3 py-1 rounded-lg border-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                isTilting
                  ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-[2px_2px_0px_#d97706] animate-pulse'
                  : currentLeftMass === currentRightMass
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-[2px_2px_0px_#059669]'
                  : 'border-rose-600 bg-rose-50 text-rose-800 shadow-[2px_2px_0px_#e11d48]'
              }`}
            >
              {isTilting && tiltStatus ? (
                <span>⚡ {tiltStatus}</span>
              ) : currentLeftMass === currentRightMass ? (
                <span>✓ KEFELER DENGEDE ({currentLeftMass} br)</span>
              ) : (
                <span>
                  ≠ {currentLeftMass > currentRightMass ? 'SOL KEFE AĞIR (↘)' : 'SAĞ KEFE AĞIR (↘)'} ({Math.abs(currentLeftMass - currentRightMass)} br fark)
                </span>
              )}
            </motion.div>
          </div>

          {/* Serbest Kefe Modu Bilgi ve Dengeleme Çubuğu */}
          {opMode === 'free' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-3 p-3 rounded-xl border-2 flex items-center justify-between flex-wrap gap-2 text-xs ${
                currentLeftMass === currentRightMass
                  ? 'border-emerald-600 bg-emerald-50/95 text-emerald-950 shadow-[2px_2px_0px_#059669]'
                  : 'border-amber-600 bg-amber-50/95 text-amber-950 shadow-[2px_2px_0px_#d97706]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{currentLeftMass === currentRightMass ? '🎉' : '🖐️'}</span>
                <div>
                  <div className="font-bold font-mono">
                    {currentLeftMass === currentRightMass
                      ? 'Harika! Terazi Tam Dengede! (Sol: ' + currentLeftMass + ' br = Sağ: ' + currentRightMass + ' br)'
                      : 'Serbest Kefe Modu: Ağır basan taraf aşağı çöktü! Dengelemek için hafif tarafa ağırlık ekle veya ağır taraftan eksilt.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGameState(prev => ({
                      ...prev,
                      currentEq: prev.equation,
                      steps: [equationToString(prev.equation)],
                    }));
                    playSound('click');
                    setFeedback({ type: 'info', message: 'Denklem başlangıç durumuna sıfırlandı.' });
                  }}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 font-mono text-xs font-bold border border-zinc-900 shadow transition-all active:scale-95"
                >
                  🔄 Başlangıca Dön
                </button>
              </div>
            </motion.div>
          )}

          {/* TERAZİ ALANI: 3B Realist WebGL Model VEYA 2B Çizim */}
          {viewMode === '3d' ? (
            <div className="relative">
              <BalanceScale3D
                leftItems={activeLeftItems}
                rightItems={activeRightItems}
                leftMass={currentLeftMass}
                rightMass={currentRightMass}
                onItemClick={handle3DItemClick}
                interactive={!gameState.solved && (gameMode !== 'rush' || !isRushGameOver)}
              />
            </div>
          ) : (
            <div className="flex justify-center py-4 bg-zinc-50/60 rounded-xl border-2 border-dashed border-zinc-300 relative select-none overflow-hidden">
              {/* Uçuşan İşlem Rozetleri (Floating Tokens) */}
              <AnimatePresence>
                {floatingTokens.map(token => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, scale: 0.5, y: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0.8, 1.25, 1.1, 0.9],
                      y: token.type === 'subtract' || token.type === 'divide' ? -42 : 36,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                    className={`absolute top-16 pointer-events-none z-20 px-3 py-1 rounded-full font-mono font-extrabold text-xs border-2 shadow-[2px_2px_0px_#18181b] ${
                      token.side === 'left' ? 'left-[22%]' : 'right-[22%]'
                    } ${
                      token.type === 'subtract'
                        ? 'bg-rose-100 text-rose-800 border-zinc-900'
                        : token.type === 'add'
                        ? 'bg-emerald-100 text-emerald-800 border-zinc-900'
                        : 'bg-amber-100 text-amber-900 border-zinc-900'
                    }`}
                  >
                    {token.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              <svg width="100%" height="300" viewBox="0 0 640 300" className="max-w-2xl overflow-visible">
                {/* Zemin Kaidesi */}
                <ellipse cx="320" cy="275" rx="90" ry="12" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />
                <rect x="313" y="70" width="14" height="205" rx="3" fill="#ffffff" stroke="#18181b" strokeWidth="2" />

                {/* Destek Üçgeni */}
                <polygon points="302,275 338,275 320,195" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

                {/* Açı Ölçer Skalası (Center Gauge Arc) */}
                <g transform="translate(320, 75)">
                  <path
                    d="M -35 -40 A 53 53 0 0 1 35 -40"
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                  />
                  <line x1="0" y1="-46" x2="0" y2="-54" stroke="#059669" strokeWidth="2" />
                  <line x1="-28" y1="-41" x2="-34" y2="-47" stroke="#71717a" strokeWidth="1.5" />
                  <line x1="28" y1="-41" x2="34" y2="-47" stroke="#71717a" strokeWidth="1.5" />
                </g>

                {/* Dönen Terazi Kolu (Spring Animasyonu) */}
                <g transform="translate(320, 75)">
                  <motion.g
                    animate={{ rotate: Math.max(-20, Math.min(20, tiltAngle)) }}
                    transition={{ type: 'spring', stiffness: 140, damping: 10, mass: 0.9 }}
                  >
                    <rect x="-240" y="-4" width="480" height="8" rx="4" fill="#18181b" stroke="#18181b" strokeWidth="1" />
                    <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="4" fill="#18181b" />
                    <polygon
                      points="-2.5,0 2.5,0 0,-44"
                      fill={Math.abs(tiltAngle) < 1 ? '#059669' : '#e11d48'}
                      stroke="#18181b"
                      strokeWidth="1.5"
                    />

                    {/* SOL KEFE ASKI MONTAJI */}
                    <g transform="translate(-190, 0)">
                      <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
                      <motion.g
                        animate={{ rotate: -Math.max(-20, Math.min(20, tiltAngle)) }}
                        transition={{ type: 'spring', stiffness: 140, damping: 10, mass: 0.9 }}
                      >
                        <line x1="0" y1="0" x2="-45" y2="76" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="0" y1="0" x2="45" y2="76" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />

                        <g transform="translate(0, 76)">
                          <ellipse cx="0" cy="0" rx="72" ry="14" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
                          <path d="M -72 0 C -72 14, 72 14, 72 0" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

                          <g transform="translate(0, -18)">
                            {Array.from({ length: Math.min(6, Math.max(0, gameState.currentEq.leftA)) }, (_, idx) => {
                              const total = Math.min(6, gameState.currentEq.leftA);
                              const xOffset = -total * 13 + idx * 26 + 13;
                              return (
                                <g
                                  key={`l-box-${idx}`}
                                  transform={`translate(${xOffset}, -8)`}
                                  className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                  onClick={() => handlePanItemClick('x', 'left')}
                                >
                                  <title>Kefelerden 1x Eksilt</title>
                                  <rect x="-11" y="-11" width="22" height="22" rx="4" fill="#2563eb" stroke="#18181b" strokeWidth="2" />
                                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">x</text>
                                </g>
                              );
                            })}

                            {gameState.currentEq.leftB !== 0 && (
                              <g
                                transform="translate(0, 14)"
                                className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
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

                          <text x="0" y="32" textAnchor="middle" fill="#18181b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                            Sol: {leftStr}
                          </text>
                        </g>
                      </motion.g>
                    </g>

                    {/* SAĞ KEFE ASKI MONTAJI */}
                    <g transform="translate(190, 0)">
                      <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
                      <motion.g
                        animate={{ rotate: -Math.max(-20, Math.min(20, tiltAngle)) }}
                        transition={{ type: 'spring', stiffness: 140, damping: 10, mass: 0.9 }}
                      >
                        <line x1="0" y1="0" x2="-45" y2="76" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="0" y1="0" x2="45" y2="76" stroke="#18181b" strokeWidth="1.5" strokeDasharray="3 2" />

                        <g transform="translate(0, 76)">
                          <ellipse cx="0" cy="0" rx="72" ry="14" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
                          <path d="M -72 0 C -72 14, 72 14, 72 0" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

                          <g transform="translate(0, -18)">
                            {Array.from({ length: Math.min(6, Math.max(0, gameState.currentEq.rightA)) }, (_, idx) => {
                              const total = Math.min(6, gameState.currentEq.rightA);
                              const xOffset = -total * 13 + idx * 26 + 13;
                              return (
                                <g
                                  key={`r-box-${idx}`}
                                  transform={`translate(${xOffset}, -8)`}
                                  className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                  onClick={() => handlePanItemClick('x', 'right')}
                                >
                                  <title>Kefelerden 1x Eksilt</title>
                                  <rect x="-11" y="-11" width="22" height="22" rx="4" fill="#2563eb" stroke="#18181b" strokeWidth="2" />
                                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">x</text>
                                </g>
                              );
                            })}

                            {gameState.currentEq.rightB !== 0 && (
                              <g
                                transform="translate(0, 14)"
                                className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
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

                          <text x="0" y="32" textAnchor="middle" fill="#18181b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                            Sağ: {rightStr}
                          </text>
                        </g>
                      </motion.g>
                    </g>
                  </motion.g>
                </g>
              </svg>
            </div>
          )}

          {/* KEFE ÇALIŞMA MODU VE KONTROL ŞERİDİ */}
          <div className="flex items-center justify-between flex-wrap gap-2 mt-4 pt-3 border-t-2 border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-zinc-700">KEFE MODU:</span>
              <div className="flex p-0.5 rounded-lg border-2 border-zinc-900 bg-zinc-100 shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpMode('balanced')}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono transition-all ${
                    opMode === 'balanced'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-700 hover:text-zinc-900'
                  }`}
                  title="Bir kefeden alıp koyduğunda terazi cebirsel dengeyi korur"
                >
                  ⚡ Otomatik Denge (Cebir)
                </button>
                <button
                  type="button"
                  onClick={() => setOpMode('free')}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono transition-all ${
                    opMode === 'free'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                      : 'text-zinc-700 hover:text-zinc-900'
                  }`}
                  title="Kefelere serbestçe ağırlık ekleyip çıkarabilirsin, terazi gerçek ağırlığa göre eğilir"
                >
                  🖐️ Serbest Kefe (Fizik)
                </button>
              </div>
            </div>

            <span className="text-[11px] text-zinc-500 font-medium">
              {opMode === 'balanced'
                ? '💡 Otomatik Denge: Tıkladığın nesne iki kefeden de eşitlenir.'
                : '⚖️ Serbest Kefe: Ağır basan taraf aşağı çöker. Kefeleri dengelemeye çalış!'}
            </span>
          </div>

          {/* KEFELERDEKİ NESNELER: ALMA (EKSİLTME) & KOYMA (EKLEME) KONTROL MASASI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {/* Sol Kefe Kontrol Masası */}
            <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-white shadow-[2px_2px_0px_#18181b] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-zinc-900 shadow-sm inline-block"></span>
                  <span className="text-xs font-bold font-mono text-zinc-900">
                    Sol Kefe: <span className="text-blue-700 font-extrabold">{leftStr}</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-300 bg-zinc-50 text-zinc-800">
                  Ağırlık: {currentLeftMass} br
                </span>
              </div>

              {/* 🗑️ Kefeden Al (Eksilt) */}
              <div>
                <div className="text-[11px] text-zinc-600 font-bold mb-1.5 flex items-center justify-between">
                  <span>🗑️ Kefeden Al (Kaldır):</span>
                  <span className="text-[10px] text-zinc-400 font-normal">3B modelden de tıklayabilirsin</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                  {activeLeftItems.length === 0 ? (
                    <span className="text-xs text-zinc-400 font-mono italic">Kefe boş (0)</span>
                  ) : (
                    activeLeftItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleRemoveItem('left', item.type, item.value)}
                        disabled={gameState.solved || isTilting}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border-2 border-zinc-900 transition-all shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] hover:scale-105 ${
                          item.type === 'x'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-amber-400 text-zinc-900 hover:bg-amber-300'
                        }`}
                        title={`${item.label} nesnesini sol kefeden kaldır`}
                      >
                        {item.type === 'x' ? '📦 −1x' : `⚖️ −${item.value}`}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* ➕ Kefeye Koy (Ağırlık Ekle) */}
              <div className="pt-2 border-t border-dashed border-zinc-200">
                <div className="text-[11px] text-zinc-600 font-bold mb-1.5 flex items-center justify-between">
                  <span>➕ Kefeye Koy (Ağırlık Ekle):</span>
                  <span className="text-[10px] text-emerald-700 font-medium font-mono">
                    {opMode === 'balanced' ? 'Her iki kefeye' : 'Sadece sol kefeye'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddItem('left', 'x', 1)}
                    disabled={gameState.solved || isTilting}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border-2 border-zinc-900 bg-blue-100 hover:bg-blue-200 text-blue-900 transition-all shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
                    title="Sol kefeye 1x sandığı koy"
                  >
                    📦 +1x
                  </button>
                  {[1, 2, 5].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAddItem('left', 'constant', v)}
                      disabled={gameState.solved || isTilting}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border-2 border-zinc-900 bg-amber-100 hover:bg-amber-200 text-amber-950 transition-all shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
                      title={`Sol kefeye +${v} pirinç ağırlık koy`}
                    >
                      ⚖️ +{v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ Kefe Kontrol Masası */}
            <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-white shadow-[2px_2px_0px_#18181b] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-zinc-900 shadow-sm inline-block"></span>
                  <span className="text-xs font-bold font-mono text-zinc-900">
                    Sağ Kefe: <span className="text-amber-800 font-extrabold">{rightStr}</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-300 bg-zinc-50 text-zinc-800">
                  Ağırlık: {currentRightMass} br
                </span>
              </div>

              {/* 🗑️ Kefeden Al (Eksilt) */}
              <div>
                <div className="text-[11px] text-zinc-600 font-bold mb-1.5 flex items-center justify-between">
                  <span>🗑️ Kefeden Al (Kaldır):</span>
                  <span className="text-[10px] text-zinc-400 font-normal">3B modelden de tıklayabilirsin</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                  {activeRightItems.length === 0 ? (
                    <span className="text-xs text-zinc-400 font-mono italic">Kefe boş (0)</span>
                  ) : (
                    activeRightItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleRemoveItem('right', item.type, item.value)}
                        disabled={gameState.solved || isTilting}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border-2 border-zinc-900 transition-all shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] hover:scale-105 ${
                          item.type === 'x'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-amber-400 text-zinc-900 hover:bg-amber-300'
                        }`}
                        title={`${item.label} nesnesini sağ kefeden kaldır`}
                      >
                        {item.type === 'x' ? '📦 −1x' : `⚖️ −${item.value}`}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* ➕ Kefeye Koy (Ağırlık Ekle) */}
              <div className="pt-2 border-t border-dashed border-zinc-200">
                <div className="text-[11px] text-zinc-600 font-bold mb-1.5 flex items-center justify-between">
                  <span>➕ Kefeye Koy (Ağırlık Ekle):</span>
                  <span className="text-[10px] text-emerald-700 font-medium font-mono">
                    {opMode === 'balanced' ? 'Her iki kefeye' : 'Sadece sağ kefeye'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddItem('right', 'x', 1)}
                    disabled={gameState.solved || isTilting}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border-2 border-zinc-900 bg-blue-100 hover:bg-blue-200 text-blue-900 transition-all shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
                    title="Sağ kefeye 1x sandığı koy"
                  >
                    📦 +1x
                  </button>
                  {[1, 2, 5].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAddItem('right', 'constant', v)}
                      disabled={gameState.solved || isTilting}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border-2 border-zinc-900 bg-amber-100 hover:bg-amber-200 text-amber-950 transition-all shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
                      title={`Sağ kefeye +${v} pirinç ağırlık koy`}
                    >
                      ⚖️ +{v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
                disabled={gameState.solved || isTilting}
                className="w-full py-3 px-4 rounded-xl font-bold bg-emerald-600 text-white border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] text-sm animate-pulse flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🎯</span> x = {stageInfo.isolatedValue} Tamamlandı! Teraziyi Onayla (Tam Puan)
              </button>
            ) : recommendedOps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recommendedOps.map((op: QuickAction, idx) => {
                  const triggerSide = op.label.includes('Sağ') ? 'right' : 'left';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleOperation(op.type, op.value, op.isVariable, triggerSide)}
                      disabled={gameState.solved || isTilting}
                      className="p-2.5 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-left transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] group disabled:opacity-50"
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
                  );
                })}
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
                    disabled={gameState.solved || (gameMode === 'rush' && isRushGameOver) || isTilting}
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
