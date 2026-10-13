import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  NimState,
  calculateNimSum,
  createInitialState,
  generateHeaps,
  makeMove,
  computerMove,
  analyzePosition,
  buildBinaryTable,
  explainWinningMove,
  findOptimalMove,
  findMisereOptimalMove,
} from '../engines/nimEngine';

type Difficulty = 'kolay' | 'orta' | 'zor';
type GameMode = 'vsComputer' | 'twoPlayer' | 'challenge' | 'strategy';
type WinRule = 'normal' | 'misere'; // normal: son taşı alan kazanır, misere: son taşı alan kaybeder

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  symbol: string;
  color: string;
}

// Antik Nehir Taşı Bileşeni (Karakalem Zen Taşı)
function StonePiece({
  isSelected,
  onClick,
  isPoison,
}: {
  isSelected: boolean;
  onClick?: () => void;
  isPoison?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full border-2 border-zinc-900 transition-all select-none flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#18181b] ${
        isSelected
          ? 'bg-rose-500 text-white -translate-y-1 shadow-[3px_3px_0px_#18181b] ring-2 ring-rose-400'
          : isPoison
          ? 'bg-amber-100 text-amber-950 hover:bg-amber-200'
          : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
      }`}
    >
      {/* Taş Dokusu / Karakalem Parıltısı */}
      <span className="w-5 h-1 rounded-full bg-white/30 absolute top-1 left-2 pointer-events-none" />
      <span className="text-[10px] font-mono font-black tracking-widest opacity-80 pointer-events-none">
        {isPoison ? '☠️' : '●'}
      </span>
    </motion.button>
  );
}

// Yığın Bileşeni
function HeapColumn({
  index,
  count,
  isActive,
  selectedCount,
  onSelect,
  highlight,
  winRule,
}: {
  index: number;
  count: number;
  isActive: boolean;
  selectedCount: number;
  onSelect: (heapIndex: number, count: number) => void;
  highlight?: boolean;
  winRule: WinRule;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Yığın Başlığı */}
      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-700">
        <span>Yığın {index + 1}</span>
        <span className="px-1.5 py-0.2 rounded border border-zinc-900 bg-zinc-100 font-black">
          {count}
        </span>
      </div>

      {/* Taş Alanı (Karakalem Kağıt Tepsisi) */}
      <div
        className={`relative flex flex-col-reverse items-center gap-1.5 p-3 rounded-2xl min-h-[160px] w-20 sm:w-24 border-2 transition-all justify-start ${
          highlight
            ? 'border-amber-500 bg-amber-50/70 shadow-[3px_3px_0px_#d97706] ring-2 ring-amber-400'
            : isActive
            ? 'border-zinc-900 bg-white/90 hover:bg-zinc-50 shadow-[3px_3px_0px_#18181b]'
            : 'border-zinc-300 bg-zinc-50 opacity-60 shadow-none'
        }`}
      >
        <AnimatePresence>
          {Array.from({ length: count }, (_, i) => {
            const isSelected = selectedCount > 0 && i >= count - selectedCount;
            const isLastStone = count === 1 && winRule === 'misere';

            return (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 10 }}
                className="w-full flex justify-center"
              >
                <StonePiece
                  isSelected={isSelected}
                  isPoison={isLastStone}
                  onClick={() => isActive && onSelect(index, count - i)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {count === 0 && (
          <div className="my-auto text-center">
            <span className="text-xs font-mono font-bold text-zinc-400 block">BOŞ</span>
            <span className="text-[10px] text-zinc-300 font-mono">0 Taş</span>
          </div>
        )}
      </div>

      {/* Hızlı Miktar Butonları (Tek tıkla 1, 2 veya Tümü) */}
      {isActive && count > 0 && (
        <div className="flex gap-1 flex-wrap justify-center w-full">
          <button
            type="button"
            onClick={() => onSelect(index, 1)}
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-zinc-900 transition-all ${
              selectedCount === 1 ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            1 Al
          </button>
          {count >= 2 && (
            <button
              type="button"
              onClick={() => onSelect(index, 2)}
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-zinc-900 transition-all ${
                selectedCount === 2 ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              2 Al
            </button>
          )}
          {count > 2 && (
            <button
              type="button"
              onClick={() => onSelect(index, count)}
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-zinc-900 transition-all ${
                selectedCount === count ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              Hepsi
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function NimGame() {
  const { setCurrentGame, recordGameResult, playSound } = useAppStore();
  const [difficulty, setDifficulty] = useState<Difficulty>('orta');
  const [gameMode, setGameMode] = useState<GameMode>('vsComputer');
  const [winRule, setWinRule] = useState<WinRule>('normal');

  // Challenge Modu Seviyesi (1: Çırak, 2: Kalfa, 3: Nim Ustası)
  const [challengeStage, setChallengeStage] = useState(1);

  const [gameState, setGameState] = useState<NimState | null>(null);
  const [selectedHeap, setSelectedHeap] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'hint'; message: string } | null>(null);
  const [showBinary, setShowBinary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [aiDialogue, setAiDialogue] = useState('Sıra sende, ilk hamleni yap!');
  const [score, setScore] = useState(0);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);

  const computerMoveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const triggerSparkles = useCallback(() => {
    const symbols = ['✦', '★', '🏛️', '●', '✓', '✨'];
    const colors = ['#2563eb', '#f59e0b', '#059669', '#18181b'];
    const newSparkles: SparkleParticle[] = Array.from({ length: 16 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 260,
      y: -Math.random() * 140 - 20,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1600);
  }, []);

  const startNewGame = useCallback((customHeaps?: number[]) => {
    let heaps: number[];
    if (customHeaps) {
      heaps = customHeaps;
    } else if (gameMode === 'challenge') {
      if (challengeStage === 1) heaps = [1, 2, 3];
      else if (challengeStage === 2) heaps = [2, 4, 6];
      else heaps = [3, 5, 7];
    } else {
      heaps = generateHeaps(difficulty);
    }

    const state = createInitialState(heaps, 0);
    setGameState(state);
    setSelectedHeap(null);
    setSelectedCount(0);
    setFeedback(null);
    setIsComputerThinking(false);
    setAiDialogue('Sıra sende! Hamleni seç.');
    clearTimeout(computerMoveTimeout.current);
  }, [difficulty, gameMode, challengeStage]);

  useEffect(() => {
    startNewGame();
    return () => clearTimeout(computerMoveTimeout.current);
  }, [startNewGame]);

  // Bilgisayar Hamlesi Mantığı
  const triggerComputerMove = useCallback((currentState: NimState) => {
    if (currentState.isGameOver || currentState.currentPlayer !== 1) return;

    setIsComputerThinking(true);
    setAiDialogue('Matematiksel optimal hamleyi hesaplıyorum...');

    computerMoveTimeout.current = setTimeout(() => {
      const isMisere = winRule === 'misere';
      const move = computerMove(currentState.heaps, difficulty, isMisere);
      const res = makeMove(currentState, move.heapIndex, move.objectsToRemove, isMisere);

      if (!res.success || !res.newState) {
        setIsComputerThinking(false);
        return;
      }

      const newState = res.newState;
      playSound('move');
      setGameState(newState);
      setIsComputerThinking(false);

      if (newState.isGameOver) {
        if (newState.winner === 1) {
          playSound('wrong');
          setAiDialogue('Zafer benim! NIM stratejisi asla yanılmaz.');
          setFeedback({
            type: 'error',
            message: isMisere
              ? 'Son taşı almaktan kurtuldum! Bilgisayar kazandı.'
              : 'Bilgisayar son taşı alarak kazandı! Tekrar dene.',
          });
          recordGameResult('nim', false, 0, 30);
        } else {
          // Oyuncu kazandı
          handlePlayerWin();
        }
      } else {
        const remainingNimSum = calculateNimSum(newState.heaps);
        if (remainingNimSum === 0) {
          setAiDialogue(`Yığın ${move.heapIndex + 1}'den ${move.objectsToRemove} taş aldım ve XOR toplamını sıfırladım!`);
        } else {
          setAiDialogue(`Yığın ${move.heapIndex + 1}'den ${move.objectsToRemove} taş aldım.`);
        }
      }
    }, 850);
  }, [difficulty, winRule, playSound, recordGameResult]);

  function handlePlayerWin() {
    playSound('win');
    triggerSparkles();
    const pts = difficulty === 'kolay' ? 40 : difficulty === 'orta' ? 80 : 150;
    setScore(s => s + pts);

    if (gameMode === 'challenge') {
      if (challengeStage < 3) {
        setFeedback({
          type: 'success',
          message: `Harika! ${challengeStage}. Aşamayı geçtin! Sıradaki usta seni bekliyor.`,
        });
        setChallengeStage(s => s + 1);
      } else {
        setFeedback({
          type: 'success',
          message: '🏆 EFSANEVİ NIM USTASI! Pisagor seviyesindeki tüm bulmacaları çözdün!',
        });
      }
    } else {
      setFeedback({
        type: 'success',
        message: winRule === 'misere'
          ? 'Tebrikler! Rakibi son zehirli taşı almaya mecbur ettin ve kazandın! ✓'
          : 'Tebrikler! Son taşı alarak NIM oyununu kazandın! ✓',
      });
    }

    setAiDialogue('Tebrik ederim! Kusursuz bir strateji izledin.');
    recordGameResult('nim', true, pts, 40);
  }

  function handleHeapSelect(heapIndex: number, count: number) {
    if (!gameState || gameState.isGameOver || isComputerThinking) return;
    if (gameMode === 'vsComputer' && gameState.currentPlayer !== 0) return;

    playSound('click');
    if (selectedHeap === heapIndex && selectedCount === count) {
      setSelectedHeap(null);
      setSelectedCount(0);
    } else {
      setSelectedHeap(heapIndex);
      setSelectedCount(count);
    }
  }

  function handleConfirmMove() {
    if (!gameState || selectedHeap === null || selectedCount === 0) return;

    const isMisere = winRule === 'misere';
    const res = makeMove(gameState, selectedHeap, selectedCount, isMisere);
    if (!res.success || !res.newState) return;

    const newState = res.newState;
    playSound('move');
    setGameState(newState);
    setSelectedHeap(null);
    setSelectedCount(0);

    if (newState.isGameOver) {
      if (newState.winner === 0) {
        handlePlayerWin();
      } else {
        playSound('wrong');
        setFeedback({ type: 'error', message: 'Son zehirli taşı sen aldın! Bilgisayar kazandı.' });
      }
    } else {
      setFeedback(null);
      if (gameMode === 'vsComputer') {
        triggerComputerMove(newState);
      }
    }
  }

  // Taktik ipucu al
  function handleTacticHint() {
    if (!gameState || gameState.isGameOver) return;
    playSound('hint');
    const isMisere = winRule === 'misere';
    const opt = isMisere ? findMisereOptimalMove(gameState.heaps) : findOptimalMove(gameState.heaps);

    if (opt && opt.isWinning) {
      setFeedback({
        type: 'hint',
        message: `💡 Optimal Hamle İpucu: Yığın ${opt.heapIndex + 1}'den ${opt.objectsToRemove} taş alırsan rakip kaybeden pozisyona düşer!`,
      });
      setSelectedHeap(opt.heapIndex);
      setSelectedCount(opt.objectsToRemove);
    } else {
      setFeedback({
        type: 'info',
        message: 'ℹ️ Mevcut pozisyon dengeli (XOR = 0). Hangi hamleyi yaparsan yap denge bozulacak, dikkatli oyna!',
      });
    }
  }

  const nimSum = gameState ? calculateNimSum(gameState.heaps) : 0;
  const analysis = gameState ? analyzePosition(gameState.heaps) : null;
  const binaryTable = gameState ? buildBinaryTable(gameState.heaps) : null;

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b-2 border-zinc-900 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => setCurrentGame(null)} className="sketch-btn text-xs font-bold">
            ← Ana Sayfa
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <h1 className="text-base font-extrabold text-zinc-900 font-mono tracking-wider">NIM OYUNU</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-1 rounded border border-zinc-900 bg-zinc-100">
              {score} Puan
            </span>
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

      {/* Yardım & Kurallar */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 p-4 rounded-xl max-w-4xl mx-auto border-2 border-zinc-900 bg-white shadow-[3px_3px_0px_#18181b]"
          >
            <h3 className="font-bold text-zinc-900 mb-1.5 text-sm flex items-center gap-2 font-mono">
              <span>📖 NIM Oyunu Stratejisi:</span>
            </h3>
            <ul className="text-xs text-zinc-700 space-y-1.5">
              <li>• Sırası gelen oyuncu tek bir yığından en az 1 taş, en fazla o yığındaki tüm taşları alabilir.</li>
              <li>• <strong>Klasik Mod:</strong> Son taşı alan oyuncu oyunu KAZANIR.</li>
              <li>• <strong>Misère (Zehirli Taş) Modu:</strong> Son taşı alan oyuncu KAYBEDER!</li>
              <li>• <strong>Matematik Sırrı:</strong> Yığınlardaki taş sayılarının XOR toplamı (NIM-Sum) 0 olduğunda pozisyon dengelidir. Karşı tarafa her zaman XOR=0 bırakmayı başaran oyuncu oyunu kazanır!</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Modlar & Kural Seçici */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Oyun Modu */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'vsComputer' as const, label: '🤖 Bilgisayara Karşı' },
              { id: 'challenge' as const, label: '⚔️ Nim Meydan Okuma' },
              { id: 'twoPlayer' as const, label: '👥 2 Oyunculu' },
              { id: 'strategy' as const, label: '🔬 Strateji Laboratuvarı' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setGameMode(m.id);
                  startNewGame();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-zinc-900 transition-all ${
                  gameMode === m.id
                    ? 'bg-zinc-900 text-white shadow-[2px_2px_0px_#18181b]'
                    : 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-[1px_1px_0px_#18181b]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Klasik vs Misère Seçici */}
          <div className="flex p-0.5 rounded-lg border-2 border-zinc-900 bg-zinc-100">
            <button
              type="button"
              onClick={() => { setWinRule('normal'); startNewGame(); }}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                winRule === 'normal' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700'
              }`}
            >
              👑 Klasik
            </button>
            <button
              type="button"
              onClick={() => { setWinRule('misere'); startNewGame(); }}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                winRule === 'misere' ? 'bg-amber-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-700'
              }`}
            >
              ☠️ Misère
            </button>
          </div>
        </div>

        {/* Challenge Modu Bilgilendirmesi */}
        {gameMode === 'challenge' && (
          <div className="paper-card !py-2.5 !px-4 bg-amber-50/70 border-2 border-amber-600">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>
                MEYDAN OKUMA SEVİYESİ: {challengeStage === 1 ? '1. Antik Çırak' : challengeStage === 2 ? '2. Bilge Gezgin' : '3. Pisagor Usta 🏆'}
              </span>
              <span>{challengeStage} / 3 Aşama</span>
            </div>
          </div>
        )}

        {/* Zorluk & Yeni Oyun */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {gameMode !== 'challenge' ? (
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
          ) : (
            <div className="text-xs font-mono text-zinc-600 font-bold">
              Kural: {winRule === 'normal' ? 'Son taşı alan kazanır' : 'Son taşı alan kaybeder (Zehirli Taş)'}
            </div>
          )}

          <button type="button" onClick={() => startNewGame()} className="sketch-btn text-xs font-bold">
            🔄 Yeni Taş Dağıtımı
          </button>
        </div>

        {gameState && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sol Kolon: Taş Alanı ve Kontroller */}
            <div className="lg:col-span-2 space-y-4">
              {/* Sıra & Yapay Zeka Diyalog Şeridi */}
              <div className="paper-card !py-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {isComputerThinking ? (
                    <span className="text-xs font-bold text-rose-700 animate-pulse flex items-center gap-1.5 font-mono">
                      <span>●</span> Bilgisayar hesaplıyor...
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-900 font-mono">
                      Sıra: <span className="underline font-black">{gameState.currentPlayer === 0 ? 'SENDE' : 'BİLGİSAYARDA'}</span>
                    </span>
                  )}
                </div>

                {/* XOR Denge Lambası */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-zinc-500 font-bold">XOR Dengesi:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-black border ${
                      nimSum === 0
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-amber-600 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {nimSum === 0 ? '✓ DENGEDE (0)' : `⚡ DENGESİZ (${nimSum})`}
                  </span>
                </div>
              </div>

              {/* Ana Taş Yığınları Masası */}
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

                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-zinc-700 uppercase font-mono">
                    Taş Yığınları (Zen Taşları)
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    {aiDialogue}
                  </span>
                </div>

                {/* Taş Sütunları */}
                <div className="flex justify-center gap-4 sm:gap-6 flex-wrap p-5 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 min-h-[200px] items-end">
                  {gameState.heaps.map((count, i) => {
                    const optMove = !gameState.isGameOver
                      ? (winRule === 'misere' ? findMisereOptimalMove(gameState.heaps) : findOptimalMove(gameState.heaps))
                      : null;
                    const isOptimalHeap = optMove?.heapIndex === i;

                    return (
                      <HeapColumn
                        key={i}
                        index={i}
                        count={count}
                        isActive={
                          !gameState.isGameOver &&
                          !isComputerThinking &&
                          (gameMode !== 'vsComputer' || gameState.currentPlayer === 0)
                        }
                        selectedCount={selectedHeap === i ? selectedCount : 0}
                        onSelect={handleHeapSelect}
                        highlight={gameMode === 'strategy' && isOptimalHeap}
                        winRule={winRule}
                      />
                    );
                  })}
                </div>

                {/* Hamle Onay & Eylem Çubuğu */}
                <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between flex-wrap gap-2">
                  {selectedHeap !== null && selectedCount > 0 && !gameState.isGameOver ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-900 font-mono">
                        Yığın {selectedHeap + 1}'den <strong>{selectedCount}</strong> taş seçildi
                      </span>
                      <button
                        type="button"
                        onClick={handleConfirmMove}
                        className="sketch-btn-dark text-xs px-4 py-2 font-bold animate-pulse"
                      >
                        Taşları Al (Hamleyi Yap) ✓
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">
                      👉 Bir yığından taş veya aşağıdaki butonlardan miktar seç
                    </span>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTacticHint}
                      disabled={gameState.isGameOver || isComputerThinking}
                      className="sketch-btn text-xs font-bold"
                    >
                      💡 Taktik İpucu
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sağ Kolon: İkili Sistem & Açıklama */}
            <div className="space-y-4">
              {/* İkili XOR Tablosu */}
              <div className="paper-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider font-mono">
                    İkili (Binary) XOR Analizi
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBinary(!showBinary)}
                    className="text-[11px] font-bold text-zinc-700 underline font-mono"
                  >
                    {showBinary ? 'Gizle' : 'Detay'}
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {binaryTable?.rows.map((row, i) => (
                    <div key={i} className="flex justify-between p-1.5 rounded border border-zinc-200 bg-zinc-50">
                      <span className="text-zinc-600">{row.label}:</span>
                      <span className="font-bold text-zinc-900">
                        {row.value} = <span className="tracking-widest">{row.bits.join(' ')}</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2 rounded-xl border-2 border-zinc-900 bg-zinc-100 font-bold mt-2">
                    <span>XOR Toplamı:</span>
                    <span className={nimSum === 0 ? 'text-emerald-700' : 'text-amber-800'}>
                      {nimSum} ({binaryTable?.nimSumRow.bits.join(' ') || nimSum.toString(2)})
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-zinc-500 leading-snug">
                  * Her bit sütunundaki 1'lerin sayısı çift ise XOR toplamı 0 olur ve pozisyon kilitlenir.
                </div>
              </div>

              {/* Pozisyon Değerlendirmesi */}
              {analysis && (
                <div className="paper-card text-xs space-y-1.5">
                  <div className="font-bold text-zinc-900 uppercase font-mono">
                    Stratejik Durum:
                  </div>
                  <p className="text-zinc-700 leading-relaxed font-sans">{analysis.explanation}</p>
                </div>
              )}
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
                {feedback.type === 'success' && (
                  <button
                    type="button"
                    onClick={() => startNewGame()}
                    className="sketch-btn-dark text-xs px-3 py-1 font-bold ml-2"
                  >
                    Yeni Tur →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
