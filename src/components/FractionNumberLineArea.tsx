import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Fraction,
  fraction,
  fractionToString,
  toDecimal,
  compare,
  generateNumberLineTask,
  AreaTask,
} from '../engines/fractionEngine';

interface FractionNumberLineAreaProps {
  difficulty: 'kolay' | 'orta' | 'zor';
  onTaskCompleted?: (points: number) => void;
}

export default function FractionNumberLineArea({
  difficulty,
  onTaskCompleted,
}: FractionNumberLineAreaProps) {
  const { playSound } = useAppStore();

  const [currentTask, setCurrentTask] = useState<AreaTask>(() => generateNumberLineTask(difficulty));
  const [placedTickIndex, setPlacedTickIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<number | null>>([]);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isTaskSuccess, setIsTaskSuccess] = useState<boolean>(false);

  const startNewTask = useCallback((diff: 'kolay' | 'orta' | 'zor' = difficulty) => {
    const task = generateNumberLineTask(diff);
    setCurrentTask(task);
    setPlacedTickIndex(null);
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

  const maxRange = currentTask.maxRange || 1;
  const den = currentTask.targetFraction.denominator;
  const totalTicks = maxRange * den; // Toplam aralık sayısı

  // Çentik noktaları hesaplama
  const ticks = useMemo(() => {
    const list = [];
    for (let i = 0; i <= totalTicks; i++) {
      const frac = fraction(i, den);
      const val = i / den;
      list.push({
        index: i,
        frac,
        val,
        label: i === 0 ? '0' : i === den ? '1' : i === 2 * den ? '2' : `${i}/${den}`,
        isMajor: i % den === 0,
      });
    }
    return list;
  }, [totalTicks, den]);

  // Çentiğe tıklama / yerleştirme
  const handleTickClick = (idx: number) => {
    if (isTaskSuccess) return;
    playSound('click');
    setHistory(prev => [...prev, placedTickIndex]);
    setPlacedTickIndex(idx);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPlacedTickIndex(last);
    setHistory(prev => prev.slice(0, -1));
    playSound('move');
  };

  const handleReset = () => {
    setPlacedTickIndex(null);
    setHistory([]);
    playSound('click');
    setFeedback({ type: 'info', message: 'İşaretçi sıfırlandı.' });
  };

  // Doğrulama
  const handleVerify = () => {
    if (placedTickIndex === null) {
      setFeedback({ type: 'error', message: 'Lütfen sayı doğrusunda bir konuma tıkla veya işaretçiyi yerleştir!' });
      return;
    }

    const selectedFrac = fraction(placedTickIndex, den);
    const isCorrect = compare(selectedFrac, currentTask.targetFraction) === 0;

    if (isCorrect) {
      playSound('win');
      setIsTaskSuccess(true);
      setFeedback({
        type: 'success',
        message: `🎉 Mükemmel! ${fractionToString(currentTask.targetFraction)} kesrini sayı doğrusunda tam doğru noktaya yerleştirdin!`,
      });
      onTaskCompleted?.(50);
    } else {
      playSound('wrong');
      const diff = toDecimal(selectedFrac) - toDecimal(currentTask.targetFraction);
      if (diff < 0) {
        setFeedback({
          type: 'error',
          message: `Daha sağa gitmelisin! Seçtiğin konum (${fractionToString(selectedFrac)} = ${toDecimal(selectedFrac).toFixed(2)}), hedeften (${fractionToString(currentTask.targetFraction)} = ${toDecimal(currentTask.targetFraction).toFixed(2)}) daha küçük.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Daha sola gitmelisin! Seçtiğin konum (${fractionToString(selectedFrac)} = ${toDecimal(selectedFrac).toFixed(2)}), hedeften (${fractionToString(currentTask.targetFraction)} = ${toDecimal(currentTask.targetFraction).toFixed(2)}) daha büyük.`,
        });
      }
    }
  };

  // SVG Ölçüleri
  const svgWidth = 620;
  const svgHeight = 160;
  const paddingX = 40;
  const lineY = 85;
  const availableWidth = svgWidth - 2 * paddingX;

  const activeHint = hintLevel === 1 ? currentTask.hint1 : hintLevel === 2 ? currentTask.hint2 : currentTask.hint3;

  return (
    <div className="space-y-4 font-sans text-zinc-900">
      {/* Görev Başlığı */}
      <div className="paper-card !bg-emerald-50/70 p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">Alan C Görevi:</span>
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

      {/* Sayı Doğrusu Etkileşimli Tezgahı */}
      <div className="paper-card space-y-4">
        <div className="text-xs font-mono text-zinc-500 flex items-center justify-between">
          <span>0 ile {maxRange} Aralığı ({den} Eş Parçaya Bölünmüş):</span>
          <span>Birim Atlama: +1/{den}</span>
        </div>

        {/* SVG Sayı Doğrusu */}
        <div className="w-full overflow-x-auto py-2 bg-zinc-50/70 rounded-xl border-2 border-dashed border-zinc-300 flex justify-center">
          <svg width={svgWidth} height={svgHeight} className="select-none overflow-visible">
            {/* Ana Doğru Çizgisi */}
            <line
              x1={paddingX}
              y1={lineY}
              x2={svgWidth - paddingX}
              y2={lineY}
              stroke="#18181b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Ok Başları */}
            <polygon
              points={`${svgWidth - paddingX + 8},${lineY} ${svgWidth - paddingX},${lineY - 6} ${svgWidth - paddingX},${lineY + 6}`}
              fill="#18181b"
            />

            {/* Birim Zıplama Yayları (0'dan seçilen çentiğe kadar) */}
            {placedTickIndex !== null && placedTickIndex > 0 && Array.from({ length: placedTickIndex }, (_, i) => {
              const startX = paddingX + (i / totalTicks) * availableWidth;
              const endX = paddingX + ((i + 1) / totalTicks) * availableWidth;
              const midX = (startX + endX) / 2;
              const arcY = lineY - 28;
              return (
                <g key={`arc-${i}`}>
                  <path
                    d={`M ${startX} ${lineY} Q ${midX} ${arcY} ${endX} ${lineY}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={midX}
                    y={arcY - 2}
                    textAnchor="middle"
                    fill="#047857"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    +1/{den}
                  </text>
                </g>
              );
            })}

            {/* Çentikler ve Tıklama Alanları */}
            {ticks.map(t => {
              const tickX = paddingX + (t.index / totalTicks) * availableWidth;
              const isSelected = placedTickIndex === t.index;
              const isMajor = t.isMajor;

              return (
                <g
                  key={t.index}
                  onClick={() => handleTickClick(t.index)}
                  className="cursor-pointer group"
                >
                  {/* Geniş Görünmez Hitbox */}
                  <rect
                    x={tickX - 16}
                    y={lineY - 30}
                    width="32"
                    height="70"
                    fill="transparent"
                  />

                  {/* Çentik Çizgisi */}
                  <line
                    x1={tickX}
                    y1={lineY - (isMajor ? 14 : 8)}
                    x2={tickX}
                    y2={lineY + (isMajor ? 14 : 8)}
                    stroke={isSelected ? '#2563eb' : '#18181b'}
                    strokeWidth={isMajor ? 3 : 2}
                    className="transition-colors group-hover:stroke-blue-600"
                  />

                  {/* Çentik Değer Etiketi */}
                  <text
                    x={tickX}
                    y={lineY + (isMajor ? 28 : 22)}
                    textAnchor="middle"
                    fill={isMajor ? '#18181b' : '#71717a'}
                    fontSize={isMajor ? '13' : '10'}
                    fontWeight={isMajor ? '900' : 'bold'}
                    fontFamily="monospace"
                  >
                    {t.label}
                  </text>

                  {/* Seçili Konum Bayrağı / İğnesi */}
                  {isSelected && (
                    <g transform={`translate(${tickX}, ${lineY})`}>
                      <circle cx="0" cy="0" r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      <line x1="0" y1="0" x2="0" y2="-45" stroke="#2563eb" strokeWidth="2.5" />
                      <polygon points="0,-45 28,-36 0,-27" fill="#2563eb" stroke="#18181b" strokeWidth="1.5" />
                      <text
                        x="12"
                        y="-33"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {t.frac.numerator}/{t.frac.denominator}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Durum Bilgisi & Kontrol Butonları */}
        <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-zinc-50 font-mono text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-600">Seçili Nokta:</span>
            <span className="font-black text-sm text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
              {placedTickIndex !== null ? `${placedTickIndex}/${den} (${(placedTickIndex / den).toFixed(2)})` : 'Henüz yerleştirilmedi'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={placedTickIndex === null || isTaskSuccess}
              className="sketch-btn-dark py-1.5 px-4 text-xs font-bold disabled:opacity-50"
            >
              Konumu Doğrula ✓
            </button>
            <button
              onClick={() => {
                playSound('hint');
                setHintLevel(h => Math.min(3, h + 1));
                setShowHintModal(true);
              }}
              className="sketch-btn py-1.5 px-3 text-xs font-bold bg-amber-200"
            >
              💡 İpucu ({hintLevel}/3)
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="sketch-btn py-1.5 px-3 text-xs font-bold disabled:opacity-40"
            >
              ↩️ Geri Al
            </button>
            <button
              onClick={handleReset}
              className="sketch-btn py-1.5 px-3 text-xs font-bold"
            >
              🔄 Sıfırla
            </button>
          </div>
        </div>
      </div>

      {/* İpucu Modalı */}
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
