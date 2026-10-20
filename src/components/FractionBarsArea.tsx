import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Fraction,
  fraction,
  fractionToString,
  compare,
  generateBarTask,
  AreaTask,
} from '../engines/fractionEngine';

interface FractionBarsAreaProps {
  difficulty: 'kolay' | 'orta' | 'zor';
  onTaskCompleted?: (points: number) => void;
}

export default function FractionBarsArea({
  difficulty,
  onTaskCompleted,
}: FractionBarsAreaProps) {
  const { playSound } = useAppStore();

  const [currentTask, setCurrentTask] = useState<AreaTask>(() => generateBarTask(difficulty));

  // Çubuk 1 Durumu
  const [den1, setDen1] = useState<number>(2);
  const [num1, setNum1] = useState<number>(1);

  // Çubuk 2 Durumu
  const [den2, setDen2] = useState<number>(4);
  const [num2, setNum2] = useState<number>(2);

  const [history, setHistory] = useState<Array<{ den1: number; num1: number; den2: number; num2: number }>>([]);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isTaskSuccess, setIsTaskSuccess] = useState<boolean>(false);

  const startNewTask = useCallback((diff: 'kolay' | 'orta' | 'zor' = difficulty) => {
    const task = generateBarTask(diff);
    setCurrentTask(task);
    setDen1(task.targetFraction.denominator);
    setNum1(0);
    setDen2(task.secondaryFraction?.denominator || 4);
    setNum2(0);
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

  const f1 = useMemo(() => fraction(num1, den1), [num1, den1]);
  const f2 = useMemo(() => fraction(num2, den2), [num2, den2]);

  const areBarsEqual = useMemo(() => {
    return num1 > 0 && num2 > 0 && compare(f1, f2) === 0;
  }, [num1, num2, f1, f2]);

  // Çubuk 1 parça tıklama
  const handlePieceClick1 = (pieceIdx: number) => {
    if (isTaskSuccess) return;
    playSound('click');
    setHistory(prev => [...prev, { den1, num1, den2, num2 }]);
    setNum1(prev => (pieceIdx < prev ? pieceIdx : pieceIdx + 1));
  };

  // Çubuk 2 parça tıklama
  const handlePieceClick2 = (pieceIdx: number) => {
    if (isTaskSuccess) return;
    playSound('click');
    setHistory(prev => [...prev, { den1, num1, den2, num2 }]);
    setNum2(prev => (pieceIdx < prev ? pieceIdx : pieceIdx + 1));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setDen1(last.den1);
    setNum1(last.num1);
    setDen2(last.den2);
    setNum2(last.num2);
    setHistory(prev => prev.slice(0, -1));
    playSound('move');
  };

  const handleReset = () => {
    setNum1(0);
    setNum2(0);
    setHistory([]);
    playSound('click');
    setFeedback({ type: 'info', message: 'Çubuklar sıfırlandı.' });
  };

  // Görevi Doğrula
  const handleVerify = () => {
    const match1 = compare(f1, currentTask.targetFraction) === 0;
    const match2 = currentTask.secondaryFraction ? compare(f2, currentTask.secondaryFraction) === 0 : areBarsEqual;

    if (match1 && match2 && areBarsEqual) {
      playSound('win');
      setIsTaskSuccess(true);
      setFeedback({
        type: 'success',
        message: `🎉 Harika İspat! ${fractionToString(f1)} = ${fractionToString(f2)} eşitliğini çubukların aynı hizada bittiğini görerek kanıtladın!`,
      });
      onTaskCompleted?.(50);
    } else if (areBarsEqual) {
      setFeedback({
        type: 'info',
        message: `Çubuklar birbirine eşit (${fractionToString(f1)} = ${fractionToString(f2)}), ancak görevdeki hedef kesirleri tam olarak oluşturmalısın: Hedef ${fractionToString(currentTask.targetFraction)} ve ${fractionToString(currentTask.secondaryFraction || f1)}.`,
      });
    } else {
      playSound('wrong');
      const comp = compare(f1, f2);
      setFeedback({
        type: 'error',
        message: comp === 1
          ? `Üstteki çubuk (${fractionToString(f1)}) alttakinden (${fractionToString(f2)}) daha uzun! Parça sayılarını eşitle.`
          : `Alttaki çubuk (${fractionToString(f2)}) üsttekinden (${fractionToString(f1)}) daha uzun! Parça sayılarını eşitle.`,
      });
    }
  };

  const width1Percent = (num1 / den1) * 100;
  const width2Percent = (num2 / den2) * 100;

  const activeHint = hintLevel === 1 ? currentTask.hint1 : hintLevel === 2 ? currentTask.hint2 : currentTask.hint3;

  return (
    <div className="space-y-4 font-sans text-zinc-900">
      {/* Görev Başlığı */}
      <div className="paper-card !bg-blue-50/70 p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📏</span>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">Alan B Görevi:</span>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 font-mono">
                {currentTask.instruction}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-white border-2 border-zinc-900 font-mono text-sm font-black shadow-[1px_1px_0px_#18181b]">
              Hedef: {fractionToString(currentTask.targetFraction)} = {fractionToString(currentTask.secondaryFraction || f1)}
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

      {/* Çubukların İncelendiği Karşılaştırma Tezgahı */}
      <div className="paper-card space-y-6">
        {/* Referans 1 Bütün Çubuğu */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-600 mb-1">
            <span>Standart Referans Bütün (1 Tam):</span>
            <span>1 / 1</span>
          </div>
          <div className="w-full h-9 rounded-xl border-2 border-zinc-900 bg-zinc-100 flex items-center justify-center font-mono font-black text-xs text-zinc-700 shadow-sm">
            1 Tam Bütün (Uzunluk: %100)
          </div>
        </div>

        {/* 1. KESİR ÇUBUĞU */}
        <div className="space-y-2 p-3.5 rounded-xl border-2 border-blue-900 bg-blue-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-zinc-900 inline-block"></span>
              <span className="text-xs font-mono font-bold text-zinc-800">1. Çubuk:</span>
              <span className="text-sm font-mono font-black text-blue-950">{num1} / {den1}</span>
            </div>

            {/* Payda Seçici */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-zinc-500">Bölüntü:</span>
              {[2, 3, 4, 6, 8, 12].map(d => (
                <button
                  key={d}
                  onClick={() => { setDen1(d); setNum1(0); playSound('click'); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${
                    den1 === d ? 'border-zinc-900 bg-blue-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* İnteraktif Çubuk */}
          <div className="w-full h-12 rounded-xl border-2 border-zinc-900 bg-white flex overflow-hidden shadow-inner relative">
            {Array.from({ length: den1 }, (_, i) => {
              const isFilled = i < num1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePieceClick1(i)}
                  className={`flex-1 h-full border-r border-zinc-900 last:border-r-0 flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    isFilled ? 'bg-blue-500 text-white shadow-inner hover:bg-blue-600' : 'bg-white hover:bg-blue-50 text-zinc-400'
                  }`}
                >
                  1/{den1}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. KESİR ÇUBUĞU */}
        <div className="space-y-2 p-3.5 rounded-xl border-2 border-amber-900 bg-amber-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-zinc-900 inline-block"></span>
              <span className="text-xs font-mono font-bold text-zinc-800">2. Çubuk:</span>
              <span className="text-sm font-mono font-black text-amber-950">{num2} / {den2}</span>
            </div>

            {/* Payda Seçici */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-zinc-500">Bölüntü:</span>
              {[2, 3, 4, 6, 8, 12].map(d => (
                <button
                  key={d}
                  onClick={() => { setDen2(d); setNum2(0); playSound('click'); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${
                    den2 === d ? 'border-zinc-900 bg-amber-500 text-zinc-950' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* İnteraktif Çubuk */}
          <div className="w-full h-12 rounded-xl border-2 border-zinc-900 bg-white flex overflow-hidden shadow-inner relative">
            {Array.from({ length: den2 }, (_, i) => {
              const isFilled = i < num2;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePieceClick2(i)}
                  className={`flex-1 h-full border-r border-zinc-900 last:border-r-0 flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    isFilled ? 'bg-amber-400 text-zinc-950 shadow-inner hover:bg-amber-500' : 'bg-white hover:bg-amber-50 text-zinc-400'
                  }`}
                >
                  1/{den2}
                </button>
              );
            })}
          </div>
        </div>

        {/* Eşitlik ve Hizalanma Lazer Çizgisi Göstergesi */}
        <div className="p-3 rounded-xl border-2 border-zinc-900 bg-zinc-50 font-mono text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{areBarsEqual ? '✨' : '📐'}</span>
            <span className="font-bold">
              {areBarsEqual ? (
                <span className="text-emerald-700 font-black text-sm">
                  ✓ DENKLİK KANITLANDI: {fractionToString(f1)} = {fractionToString(f2)} (Aynı Hizada)
                </span>
              ) : (
                <span className="text-zinc-600">
                  {num1 === 0 || num2 === 0
                    ? 'Her iki çubukta da parçaları boyayarak uzunluklarını kıyasla.'
                    : `Uzunluklar: %${width1Percent.toFixed(1)} vs %${width2Percent.toFixed(1)} (${Math.abs(width1Percent - width2Percent).toFixed(1)} fark)`}
                </span>
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              className="sketch-btn-dark py-1.5 px-4 text-xs font-bold"
            >
              Doğrula ✓
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
