import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Fraction,
  fraction,
  fractionToString,
  toDecimal,
  compare,
  generateCircleTask,
  AreaTask,
} from '../engines/fractionEngine';

interface FractionCirclesAreaProps {
  difficulty: 'kolay' | 'orta' | 'zor';
  onTaskCompleted?: (points: number) => void;
}

export default function FractionCirclesArea({
  difficulty,
  onTaskCompleted,
}: FractionCirclesAreaProps) {
  const { playSound } = useAppStore();

  const [currentTask, setCurrentTask] = useState<AreaTask>(() => generateCircleTask(difficulty));
  const [denominator, setDenominator] = useState<number>(4);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0, 1, 2]);
  const [history, setHistory] = useState<number[][]>([]);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isTaskSuccess, setIsTaskSuccess] = useState<boolean>(false);

  // Görev değiştiğinde veya zorluk değiştiğinde
  const startNewTask = useCallback((diff: 'kolay' | 'orta' | 'zor' = difficulty) => {
    const task = generateCircleTask(diff);
    setCurrentTask(task);
    setDenominator(task.targetFraction.denominator);
    setSelectedIndices([]);
    setHistory([]);
    setHintLevel(0);
    setIsTaskSuccess(false);
    setFeedback({
      type: 'info',
      message: `Yeni Görev: ${task.instruction}`,
    });
  }, [difficulty]);

  useEffect(() => {
    startNewTask(difficulty);
  }, [difficulty, startNewTask]);

  // Mevcut kesir değeri
  const currentFraction = useMemo(() => {
    return fraction(selectedIndices.length, denominator);
  }, [selectedIndices.length, denominator]);

  // Dilim tıklama (seç/kaldır)
  const toggleSlice = (idx: number) => {
    if (isTaskSuccess) return;
    playSound('click');
    setHistory(prev => [...prev, [...selectedIndices]]);

    setSelectedIndices(prev => {
      const next = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      return next;
    });
  };

  // Geri Al (Undo)
  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setSelectedIndices(last);
    setHistory(prev => prev.slice(0, -1));
    playSound('move');
  };

  // Sıfırla (Reset)
  const handleReset = () => {
    setSelectedIndices([]);
    setHistory([]);
    playSound('click');
    setFeedback({ type: 'info', message: 'Daire temizlendi.' });
  };

  // Kontrol Et (Verify)
  const handleVerify = () => {
    const isMatch = compare(currentFraction, currentTask.targetFraction) === 0;

    if (isMatch) {
      playSound('win');
      setIsTaskSuccess(true);
      setFeedback({
        type: 'success',
        message: `🎉 Harika! ${fractionToString(currentTask.targetFraction)} kesrini dairesel modelde tam doğru oluşturdun!`,
      });
      onTaskCompleted?.(50);
    } else {
      playSound('wrong');
      const diffComp = compare(currentFraction, currentTask.targetFraction);
      if (diffComp === -1) {
        setFeedback({
          type: 'error',
          message: `Eksik dilim var! Hedef ${fractionToString(currentTask.targetFraction)}, senin oluşturduğun: ${fractionToString(currentFraction)}. Biraz daha dilim boyamalısın.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Fazla dilim boyadın! Hedef ${fractionToString(currentTask.targetFraction)}, senin oluşturduğun: ${fractionToString(currentFraction)}. Fazla dilimlere tıklayarak boyayı kaldır.`,
        });
      }
    }
  };

  // SVG Yay Yolu Hesaplayıcı (Kesin Geometrik Açı)
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  const slices = useMemo(() => {
    const result = [];
    const angleStep = (2 * Math.PI) / denominator;

    for (let i = 0; i < denominator; i++) {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1) * angleStep - Math.PI / 2;
      const midAngle = startAngle + angleStep / 2;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angleStep > Math.PI ? 1 : 0;

      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const labelX = cx + (r * 0.65) * Math.cos(midAngle);
      const labelY = cy + (r * 0.65) * Math.sin(midAngle);

      result.push({
        index: i,
        path,
        labelX,
        labelY,
        isSelected: selectedIndices.includes(i),
      });
    }
    return result;
  }, [denominator, selectedIndices, cx, cy, r]);

  const activeHint = hintLevel === 1 ? currentTask.hint1 : hintLevel === 2 ? currentTask.hint2 : currentTask.hint3;

  return (
    <div className="space-y-4">
      {/* Görev Kartı */}
      <div className="paper-card !bg-amber-50/70 p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">Alan A Görevi:</span>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 font-mono">
                {currentTask.instruction}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-white border-2 border-zinc-900 font-mono text-sm font-black shadow-[1px_1px_0px_#18181b]">
              Hedef: {fractionToString(currentTask.targetFraction)}
            </div>
            <button
              onClick={() => startNewTask(difficulty)}
              className="sketch-btn py-1 px-3 text-xs font-bold font-mono"
            >
              🔀 Yeni Görev
            </button>
          </div>
        </div>
      </div>

      {/* Geri Bildirim */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`p-3 rounded-xl border-2 font-mono text-xs font-bold ${
              feedback.type === 'success'
                ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
                : feedback.type === 'error'
                ? 'border-rose-700 bg-rose-100 text-rose-950'
                : 'border-blue-700 bg-blue-100 text-blue-950'
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ana Çalışma Alanı: Daire & Kontroller */}
      <div className="paper-card grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Sol Kolon: Büyük Etkileşimli Kesir Dairesi */}
        <div className="flex flex-col items-center justify-center relative">
          <div className="relative">
            <svg width={size} height={size} className="overflow-visible select-none">
              {/* Dış Çerçeve */}
              <circle
                cx={cx}
                cy={cy}
                r={r + 8}
                fill="#fdfbf7"
                stroke="#18181b"
                strokeWidth="3"
                strokeDasharray={isTaskSuccess ? 'none' : '4 3'}
              />
              <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#18181b" strokeWidth="2" />

              {/* Dilimler */}
              {slices.map(s => (
                <g key={s.index} onClick={() => toggleSlice(s.index)} className="cursor-pointer group">
                  <path
                    d={s.path}
                    fill={s.isSelected ? '#f59e0b' : '#ffffff'}
                    stroke="#18181b"
                    strokeWidth="2"
                    className="transition-colors duration-150 group-hover:opacity-85"
                  />
                  {/* 1/d Birim Kesir Etiketi */}
                  <text
                    x={s.labelX}
                    y={s.labelY + 4}
                    textAnchor="middle"
                    fill={s.isSelected ? '#ffffff' : '#71717a'}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="pointer-events-none"
                  >
                    1/{denominator}
                  </text>
                </g>
              ))}

              {/* Merkez Bağlantı Pimi */}
              <circle cx={cx} cy={cy} r={6} fill="#18181b" />
            </svg>

            {isTaskSuccess && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 px-3 py-1 rounded-xl bg-emerald-400 border-2 border-zinc-900 font-mono font-black text-xs shadow-[2px_2px_0px_#18181b]"
              >
                ✓ TAM İSABET!
              </motion.div>
            )}
          </div>

          <div className="text-xs text-zinc-500 font-mono mt-2">
            (Dilimlerin üzerine tıklayarak boyayabilir veya boyayı kaldırabilirsin)
          </div>
        </div>

        {/* Sağ Kolon: Payda Seçici, Değer Paneli ve İşlem Butonları */}
        <div className="space-y-4">
          {/* Payda (Bölüntü Derecesi) Seçici */}
          <div>
            <label className="text-xs font-mono font-bold uppercase text-zinc-600 block mb-1.5">
              1. Bütünün Bölüntü Sayısını (Payda) Seç:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[2, 3, 4, 5, 6, 8, 12].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDenominator(d);
                    setSelectedIndices([]);
                    playSound('click');
                  }}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-mono font-black transition-all ${
                    denominator === d
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-[2px_2px_0px_#18181b]'
                      : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  {d} Eş Parça
                </button>
              ))}
            </div>
          </div>

          {/* Kesir Değer Göstergesi */}
          <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-zinc-50 font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Oluşturulan Kesir:</span>
              <span className="text-2xl font-black text-amber-950">
                {selectedIndices.length} / {denominator}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-600 pt-1.5 border-t border-zinc-200">
              <span>Birim Kesir: <strong>1/{denominator}</strong></span>
              <span>Ondalık: <strong>{toDecimal(currentFraction).toFixed(2)}</strong></span>
              <span>Yüzde: <strong>%{(toDecimal(currentFraction) * 100).toFixed(0)}</strong></span>
            </div>
          </div>

          {/* Araçlar & Kontrol Butonları */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isTaskSuccess}
              className="flex-1 py-2.5 px-4 rounded-xl border-2 border-zinc-900 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-mono font-black text-xs sm:text-sm shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50"
            >
              Görevi Kontrol Et ✓
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('hint');
                setHintLevel(h => Math.min(3, h + 1));
                setShowHintModal(true);
              }}
              className="py-2.5 px-3 rounded-xl border-2 border-zinc-900 bg-amber-200 hover:bg-amber-300 text-zinc-950 font-mono font-bold text-xs shadow-[1px_1px_0px_#18181b]"
            >
              💡 İpucu ({hintLevel}/3)
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0 || isTaskSuccess}
              className="py-2.5 px-3 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 font-mono font-bold text-xs shadow-[1px_1px_0px_#18181b] disabled:opacity-40"
            >
              ↩️ Geri Al
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="py-2.5 px-3 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 font-mono font-bold text-xs shadow-[1px_1px_0px_#18181b]"
            >
              🔄 Sıfırla
            </button>
          </div>
        </div>
      </div>

      {/* 3 Aşamalı İpucu Modalı */}
      <AnimatePresence>
        {showHintModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-md w-full p-6 space-y-3 font-mono text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="font-black text-sm text-zinc-900 flex items-center gap-1.5">
                  <span>💡</span> {hintLevel}. Aşama İpucu Desteği:
                </span>
                <button onClick={() => setShowHintModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-zinc-800 font-medium">
                {activeHint}
              </div>

              <div className="flex gap-2 pt-2">
                {hintLevel < 3 && (
                  <button
                    onClick={() => setHintLevel(h => h + 1)}
                    className="sketch-btn flex-1 py-2 text-xs font-bold"
                  >
                    Daha Fazla İpucu ({hintLevel + 1}/3) →
                  </button>
                )}
                <button
                  onClick={() => setShowHintModal(false)}
                  className="sketch-btn-dark flex-1 py-2 text-xs font-bold"
                >
                  Tamam, Anladım ✓
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
