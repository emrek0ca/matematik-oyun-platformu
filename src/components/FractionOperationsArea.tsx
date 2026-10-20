import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Fraction,
  fraction,
  fractionToString,
  add,
  subtract,
  compare,
  lcm,
  generateOperationsTask,
  AreaTask,
  getCommonDenominatorSteps,
} from '../engines/fractionEngine';

interface FractionOperationsAreaProps {
  difficulty: 'kolay' | 'orta' | 'zor';
  onTaskCompleted?: (points: number) => void;
}

export default function FractionOperationsArea({
  difficulty,
  onTaskCompleted,
}: FractionOperationsAreaProps) {
  const { playSound } = useAppStore();

  const [currentTask, setCurrentTask] = useState<AreaTask>(() => generateOperationsTask(difficulty));

  // İşlem Adımı:
  // 1: İnceleme & Uyuşmazlık Tespiti (Farklı paydalarda doğrudan birleşememe engeli)
  // 2: Ortak Paydada Eşitleme (Dilimleri alt parçalara bölme)
  // 3: Fiziksel Birleştirme / Sonuç Tepsisine Taşıma
  // 4: Tamamlandı & Sadeleştirme
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Birleştirme Tepsisindeki Taşınan Parça Sayısı
  const [collectedPieces, setCollectedPieces] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const startNewTask = useCallback((diff: 'kolay' | 'orta' | 'zor' = difficulty) => {
    const task = generateOperationsTask(diff);
    setCurrentTask(task);
    setCurrentStep(1);
    setCollectedPieces(0);
    setHistory([]);
    setHintLevel(0);
    setFeedback({
      type: 'info',
      message: `Yeni Görev: ${task.instruction}`,
    });
  }, [difficulty]);

  useEffect(() => {
    startNewTask(difficulty);
  }, [difficulty, startNewTask]);

  // Kesir A ve B
  const fracA = currentTask.targetFraction && currentTask.secondaryFraction && currentTask.operation
    ? (currentTask.operation === 'add'
        ? subtract(currentTask.targetFraction, currentTask.secondaryFraction)
        : add(currentTask.targetFraction, currentTask.secondaryFraction))
    : fraction(1, 2);
  const fracB = currentTask.secondaryFraction || fraction(1, 4);
  const operation = currentTask.operation || 'add';

  // Ortak Payda Detayları
  const commonSteps = useMemo(() => {
    return getCommonDenominatorSteps(fracA, fracB, operation);
  }, [fracA, fracB, operation]);

  const hasDifferentDenominators = fracA.denominator !== fracB.denominator;
  const commonDen = commonSteps.commonDen;
  const targetPiecesCount = commonSteps.result.numerator;

  // Adım 2'ye Geçiş (Genişletme)
  const handleSplitToCommon = () => {
    playSound('move');
    setCurrentStep(2);
    setFeedback({
      type: 'info',
      message: `Parçalar alt dilimlere ayrıldı! Artık her iki kesir de 1/${commonDen}'lik eş parçalardan oluşuyor.`,
    });
  };

  // Parçayı Tepsiye Ekleme
  const handleAddPieceToResult = () => {
    if (currentStep < 2) return;
    playSound('click');
    setHistory(prev => [...prev, collectedPieces]);
    setCollectedPieces(prev => prev + 1);
    if (currentStep === 2) setCurrentStep(3);
  };

  // Parçayı Tepsiden Çıkarma
  const handleRemovePieceFromResult = () => {
    if (collectedPieces <= 0) return;
    playSound('move');
    setHistory(prev => [...prev, collectedPieces]);
    setCollectedPieces(prev => prev - 1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setCollectedPieces(last);
    setHistory(prev => prev.slice(0, -1));
    playSound('move');
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCollectedPieces(0);
    setHistory([]);
    playSound('click');
    setFeedback({ type: 'info', message: 'İşlem sıfırlandı.' });
  };

  // Görevi Doğrula
  const handleVerify = () => {
    if (collectedPieces === targetPiecesCount) {
      playSound('win');
      setCurrentStep(4);
      setFeedback({
        type: 'success',
        message: `🎉 Harika! ${fractionToString(fracA)} ${operation === 'add' ? '+' : '−'} ${fractionToString(fracB)} = ${fractionToString(commonSteps.simplifiedResult)} işlemini geometrik olarak başarıyla tamamladın!`,
      });
      onTaskCompleted?.(50);
    } else {
      playSound('wrong');
      const diff = targetPiecesCount - collectedPieces;
      if (diff > 0) {
        setFeedback({
          type: 'error',
          message: `Eksik parça var! Sonuç tepsisine ${diff} adet daha 1/${commonDen} parçası eklemelisin.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Fazla parça koydun! Sonuç tepsisinden ${Math.abs(diff)} adet parça çıkarmalısın.`,
        });
      }
    }
  };

  const activeHint = hintLevel === 1 ? currentTask.hint1 : hintLevel === 2 ? currentTask.hint2 : currentTask.hint3;

  return (
    <div className="space-y-4 font-sans text-zinc-900">
      {/* Görev Başlığı */}
      <div className="paper-card !bg-purple-50/70 p-4 border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">➕</span>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">Alan D Görevi:</span>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 font-mono">
                {currentTask.instruction}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-white border-2 border-zinc-900 font-mono text-sm font-black shadow-[1px_1px_0px_#18181b]">
              Hedef Sonuç: {fractionToString(commonSteps.simplifiedResult)}
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

      {/* 4 Aşamalı Pedagojik Süreç Masası */}
      <div className="paper-card space-y-5">
        {/* Adım 1 & 2: Kaynak Kesirler ve Ortak Parçalama Uyarısı */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kesir A Modeli */}
          <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-blue-50/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>1. Kesir (A):</span>
              <span className="text-sm font-black text-blue-900">{fractionToString(fracA)}</span>
            </div>
            <div className="w-full h-9 rounded-lg border-2 border-zinc-900 bg-white flex overflow-hidden">
              {Array.from({ length: currentStep >= 2 ? commonDen : fracA.denominator }, (_, i) => {
                const filledLimit = currentStep >= 2 ? commonSteps.expandedA.numerator : fracA.numerator;
                const isFilled = i < filledLimit;
                return (
                  <div
                    key={i}
                    className={`flex-1 h-full border-r border-zinc-900 last:border-r-0 flex items-center justify-center font-mono text-[10px] font-bold ${
                      isFilled ? 'bg-blue-500 text-white' : 'bg-white text-zinc-300'
                    }`}
                  >
                    1/{currentStep >= 2 ? commonDen : fracA.denominator}
                  </div>
                );
              })}
            </div>
            {currentStep >= 2 && hasDifferentDenominators && (
              <div className="text-[11px] font-mono text-blue-800">
                ↳ Genişletildi: {commonSteps.expandedA.numerator}/{commonDen}
              </div>
            )}
          </div>

          {/* Kesir B Modeli */}
          <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-amber-50/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>2. Kesir (B):</span>
              <span className="text-sm font-black text-amber-900">{fractionToString(fracB)}</span>
            </div>
            <div className="w-full h-9 rounded-lg border-2 border-zinc-900 bg-white flex overflow-hidden">
              {Array.from({ length: currentStep >= 2 ? commonDen : fracB.denominator }, (_, i) => {
                const filledLimit = currentStep >= 2 ? commonSteps.expandedB.numerator : fracB.numerator;
                const isFilled = i < filledLimit;
                return (
                  <div
                    key={i}
                    className={`flex-1 h-full border-r border-zinc-900 last:border-r-0 flex items-center justify-center font-mono text-[10px] font-bold ${
                      isFilled ? 'bg-amber-400 text-zinc-950' : 'bg-white text-zinc-300'
                    }`}
                  >
                    1/{currentStep >= 2 ? commonDen : fracB.denominator}
                  </div>
                );
              })}
            </div>
            {currentStep >= 2 && hasDifferentDenominators && (
              <div className="text-[11px] font-mono text-amber-800">
                ↳ Genişletildi: {commonSteps.expandedB.numerator}/{commonDen}
              </div>
            )}
          </div>
        </div>

        {/* Farklı Payda Uyarısı & Ortak Parçalama Butonu */}
        {hasDifferentDenominators && currentStep === 1 && (
          <div className="p-3.5 rounded-xl border-2 border-amber-600 bg-amber-50 text-amber-950 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="font-extrabold">Farklı Payda Engeli (Görsel Kanıt):</div>
                <div className="text-[11px] text-zinc-700">
                  Dilimlerin boyutları eşit değil (1/{fracA.denominator} ≠ 1/{fracB.denominator}). Eşit olmayan parçalar doğrudan {operation === 'add' ? 'toplanamaz' : 'çıkarılamaz'}!
                </div>
              </div>
            </div>
            <button
              onClick={handleSplitToCommon}
              className="sketch-btn-dark py-2 px-4 text-xs font-bold animate-pulse"
            >
              Ortak Paydaya (${commonDen}) Genişlet ⚡
            </button>
          </div>
        )}

        {/* Adım 3: Sonuç Tepsisi (Fiziksel Birleştirme Alanı) */}
        <div className="p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="flex items-center gap-1.5">
              <span>🍽️</span> Sonuç Tepsisi ({operation === 'add' ? 'Toplama' : 'Çıkarma'} Birleşimi):
            </span>
            <span className="text-sm font-black text-emerald-800">
              {collectedPieces} / {commonDen}
            </span>
          </div>

          {/* Sonuç Tepsisi Çubuğu */}
          <div className="w-full h-12 rounded-xl border-2 border-zinc-900 bg-white flex overflow-hidden shadow-inner">
            {Array.from({ length: commonDen }, (_, i) => {
              const isCollected = i < collectedPieces;
              return (
                <div
                  key={i}
                  onClick={handleRemovePieceFromResult}
                  className={`flex-1 h-full border-r border-zinc-900 last:border-r-0 flex items-center justify-center font-mono text-xs font-bold cursor-pointer transition-all ${
                    isCollected
                      ? 'bg-emerald-500 text-white shadow-inner hover:bg-emerald-600'
                      : 'bg-white hover:bg-zinc-100 text-zinc-300'
                  }`}
                  title="Parçaya tıklayarak tepsiden çıkarabilirsin"
                >
                  {isCollected ? `1/${commonDen}` : ''}
                </div>
              );
            })}
          </div>

          {/* Parça Taşıma Butonları */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddPieceToResult}
                disabled={currentStep < 2 && hasDifferentDenominators}
                className="sketch-btn py-1.5 px-3 text-xs font-bold font-mono bg-emerald-100 hover:bg-emerald-200"
              >
                ➕ 1/{commonDen} Parçası Ekle
              </button>
              <button
                type="button"
                onClick={handleRemovePieceFromResult}
                disabled={collectedPieces <= 0}
                className="sketch-btn py-1.5 px-3 text-xs font-bold font-mono"
              >
                ➖ 1 Parça Çıkar
              </button>
            </div>

            <div className="text-[11px] font-mono text-zinc-500">
              (Tepsideki parçaya tıklayarak da çıkarabilirsin)
            </div>
          </div>
        </div>

        {/* Kontrol ve İpucu Butonları */}
        <div className="flex gap-2 flex-wrap pt-2 border-t border-zinc-200">
          <button
            type="button"
            onClick={handleVerify}
            className="sketch-btn-dark flex-1 py-2 text-xs font-bold"
          >
            İşlemi Doğrula ✓
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('hint');
              setHintLevel(h => Math.min(3, h + 1));
              setShowHintModal(true);
            }}
            className="sketch-btn py-2 px-4 text-xs font-bold bg-amber-200"
          >
            💡 İpucu ({hintLevel}/3)
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="sketch-btn py-2 px-3 text-xs font-bold disabled:opacity-40"
          >
            ↩️ Geri Al
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="sketch-btn py-2 px-3 text-xs font-bold"
          >
            🔄 Sıfırla
          </button>
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
