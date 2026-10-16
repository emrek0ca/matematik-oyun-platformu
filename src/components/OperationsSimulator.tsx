import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fraction,
  fractionToString,
  getCommonDenominatorSteps,
  FractionModelType,
  simplify,
} from '../engines/fractionEngine';
import { CircleModel, StripModel, GridModel, NumberLineModel } from './FractionModels';

export default function OperationsSimulator() {
  const [num1, setNum1] = useState(1);
  const [den1, setDen1] = useState(2);
  const [num2, setNum2] = useState(1);
  const [den2, setDen2] = useState(3);
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [modelType, setModelType] = useState<FractionModelType>('circle');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMerged, setIsMerged] = useState(false);

  const frac1: Fraction = useMemo(() => ({ numerator: num1, denominator: den1 }), [num1, den1]);
  const frac2: Fraction = useMemo(() => ({ numerator: num2, denominator: den2 }), [num2, den2]);

  const stepsInfo = useMemo(() => {
    return getCommonDenominatorSteps(frac1, frac2, operation);
  }, [frac1, frac2, operation]);

  const areDenominatorsEqual = den1 === den2;

  // Yeni işlem seçildiğinde adımları sıfırla
  const handleResetSteps = () => {
    setIsExpanded(false);
    setIsMerged(false);
  };

  const PRESETS: Array<{ n1: number; d1: number; op: 'add' | 'subtract'; n2: number; d2: number; label: string }> = [
    { n1: 1, d1: 2, op: 'add', n2: 1, d2: 3, label: '1/2 + 1/3' },
    { n1: 3, d1: 4, op: 'subtract', n2: 1, d2: 2, label: '3/4 − 1/2' },
    { n1: 2, d1: 3, op: 'add', n2: 1, d2: 4, label: '2/3 + 1/4' },
    { n1: 1, d1: 4, op: 'add', n2: 3, d2: 8, label: '1/4 + 3/8' },
    { n1: 5, d1: 6, op: 'subtract', n2: 1, d2: 3, label: '5/6 − 1/3' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Bilgi Kartı: Pedagojik Kanıt */}
      <div className="p-4 rounded-xl border-2 border-zinc-900 bg-blue-50/70 shadow-[2px_2px_0px_#18181b]">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-mono font-black text-sm text-zinc-900">
              Ortak Payda Zorunluluğunun Görsel Kanıtı
            </h3>
            <p className="text-xs text-zinc-700 mt-1 leading-relaxed">
              Farklı paydalı iki kesir toplandığında veya çıkarıldığında, dilimlerin geometrik boyutları birbirinden farklıdır (Örn:{' '}
              <strong>1/{den1}</strong> dilimi ile <strong>1/{den2}</strong> dilimi eşit büyüklükte değildir).{' '}
              Geometrik birleştirme yapılabilmesi için her iki model de önce <strong>ortak paydada ({stepsInfo.commonDen})</strong> eş parçalara genişletilmelidir!
            </p>
          </div>
        </div>
      </div>

      {/* Kontrol Paneli: İşlem Seçici ve Hazır Örnekler */}
      <div className="paper-card p-4 space-y-4">
        {/* Model Türü & Hızlı Şablonlar */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-zinc-600 mr-1">Örnek İşlemler:</span>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setNum1(p.n1);
                  setDen1(p.d1);
                  setOperation(p.op);
                  setNum2(p.n2);
                  setDen2(p.d2);
                  handleResetSteps();
                }}
                className={`px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold transition-all ${
                  num1 === p.n1 && den1 === p.d1 && operation === p.op && num2 === p.n2 && den2 === p.d2
                    ? 'bg-blue-600 text-white shadow-[1px_1px_0px_#1e3a8a]'
                    : 'bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {[
              { id: 'circle', icon: '🟡', label: 'Daire' },
              { id: 'strip', icon: '📏', label: 'Şerit' },
              { id: 'grid', icon: '🔲', label: 'Izgara' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelType(m.id as FractionModelType)}
                className={`px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold transition-all ${
                  modelType === m.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canlı Denklem Başlığı ve Adım Düğmeleri */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-black text-zinc-950">
            <span className="px-2.5 py-1 rounded-lg border-2 border-amber-600 bg-amber-50 text-amber-950">
              {fractionToString(frac1)}
            </span>
            <span className="text-zinc-600 font-bold">{operation === 'add' ? '+' : '−'}</span>
            <span className="px-2.5 py-1 rounded-lg border-2 border-indigo-600 bg-indigo-50 text-indigo-950">
              {fractionToString(frac2)}
            </span>
            <span className="text-zinc-400">=</span>
            <span className={`px-2.5 py-1 rounded-lg border-2 ${isMerged ? 'border-emerald-600 bg-emerald-100 text-emerald-950' : 'border-dashed border-zinc-400 bg-zinc-50 text-zinc-400'}`}>
              {isMerged ? fractionToString(stepsInfo.simplifiedResult) : '?'}
            </span>
          </div>

          {/* Adım Eylem Düğmeleri */}
          <div className="flex items-center gap-2">
            {!isExpanded && !areDenominatorsEqual && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="px-4 py-2 rounded-xl border-2 border-zinc-900 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs shadow-[2px_2px_0px_#1e3a8a] flex items-center gap-1.5 active:scale-95 transition-all animate-pulse"
              >
                <span>⚡ 1. Adım: Ortak Paydada Eşitle (EKOK: {stepsInfo.commonDen})</span>
              </button>
            )}

            {(isExpanded || areDenominatorsEqual) && !isMerged && (
              <button
                type="button"
                onClick={() => setIsMerged(true)}
                className="px-4 py-2 rounded-xl border-2 border-zinc-900 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs shadow-[2px_2px_0px_#065f46] flex items-center gap-1.5 active:scale-95 transition-all animate-bounce"
              >
                <span>🎉 2. Adım: Geometrik Olarak {operation === 'add' ? 'Birleştir (Topla)' : 'Çıkar'}</span>
              </button>
            )}

            {(isExpanded || isMerged) && (
              <button
                type="button"
                onClick={handleResetSteps}
                className="px-3 py-2 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 font-mono font-bold text-xs shadow-[1px_1px_0px_#18181b]"
              >
                ⟲ Başa Al
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Geometrik Modeller Sahnesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Model 1 */}
        <div className="paper-card flex flex-col items-center justify-between p-4 space-y-3 relative">
          <div className="w-full flex justify-between items-center">
            <span className="font-mono text-xs font-black text-amber-900 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
              1. Kesir
            </span>
            {isExpanded && !areDenominatorsEqual && (
              <span className="text-[10px] font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                ×{stepsInfo.aFactor} ile genişletildi
              </span>
            )}
          </div>

          <div className="my-2 min-h-[170px] flex items-center justify-center">
            {modelType === 'circle' && (
              <CircleModel
                numerator={isExpanded ? stepsInfo.expandedA.numerator : frac1.numerator}
                denominator={isExpanded ? stepsInfo.expandedA.denominator : frac1.denominator}
                interactive={false}
                color="#f59e0b"
                size={170}
              />
            )}
            {modelType === 'strip' && (
              <StripModel
                numerator={isExpanded ? stepsInfo.expandedA.numerator : frac1.numerator}
                denominator={isExpanded ? stepsInfo.expandedA.denominator : frac1.denominator}
                interactive={false}
                color="#f59e0b"
              />
            )}
            {modelType === 'grid' && (
              <GridModel
                numerator={isExpanded ? stepsInfo.expandedA.numerator : frac1.numerator}
                denominator={isExpanded ? stepsInfo.expandedA.denominator : frac1.denominator}
                interactive={false}
                color="#f59e0b"
                size={170}
              />
            )}
          </div>

          <div className="text-center font-mono">
            <div className="text-lg font-black text-amber-950">
              {isExpanded ? `${stepsInfo.expandedA.numerator}/${stepsInfo.commonDen}` : fractionToString(frac1)}
            </div>
            <div className="text-[11px] text-zinc-500">
              Birim Dilim: 1/{isExpanded ? stepsInfo.commonDen : frac1.denominator}
            </div>
          </div>
        </div>

        {/* Model 2 */}
        <div className="paper-card flex flex-col items-center justify-between p-4 space-y-3 relative">
          <div className="w-full flex justify-between items-center">
            <span className="font-mono text-xs font-black text-indigo-900 px-2 py-0.5 rounded bg-indigo-100 border border-indigo-300">
              2. Kesir
            </span>
            {isExpanded && !areDenominatorsEqual && (
              <span className="text-[10px] font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                ×{stepsInfo.bFactor} ile genişletildi
              </span>
            )}
          </div>

          <div className="my-2 min-h-[170px] flex items-center justify-center">
            {modelType === 'circle' && (
              <CircleModel
                numerator={isExpanded ? stepsInfo.expandedB.numerator : frac2.numerator}
                denominator={isExpanded ? stepsInfo.expandedB.denominator : frac2.denominator}
                interactive={false}
                color="#6366f1"
                size={170}
              />
            )}
            {modelType === 'strip' && (
              <StripModel
                numerator={isExpanded ? stepsInfo.expandedB.numerator : frac2.numerator}
                denominator={isExpanded ? stepsInfo.expandedB.denominator : frac2.denominator}
                interactive={false}
                color="#6366f1"
              />
            )}
            {modelType === 'grid' && (
              <GridModel
                numerator={isExpanded ? stepsInfo.expandedB.numerator : frac2.numerator}
                denominator={isExpanded ? stepsInfo.expandedB.denominator : frac2.denominator}
                interactive={false}
                color="#6366f1"
                size={170}
              />
            )}
          </div>

          <div className="text-center font-mono">
            <div className="text-lg font-black text-indigo-950">
              {isExpanded ? `${stepsInfo.expandedB.numerator}/${stepsInfo.commonDen}` : fractionToString(frac2)}
            </div>
            <div className="text-[11px] text-zinc-500">
              Birim Dilim: 1/{isExpanded ? stepsInfo.commonDen : frac2.denominator}
            </div>
          </div>
        </div>

        {/* Sonuç Modeli (Birleştirilmiş Sonuç) */}
        <div className={`paper-card flex flex-col items-center justify-between p-4 space-y-3 md:col-span-2 lg:col-span-1 transition-all ${
          isMerged ? 'bg-emerald-50/70 border-emerald-700 shadow-[3px_3px_0px_#047857]' : 'opacity-70 bg-zinc-50'
        }`}>
          <div className="w-full flex justify-between items-center">
            <span className="font-mono text-xs font-black text-emerald-950 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-400">
              ✓ Birleştirilmiş Sonuç
            </span>
            {isMerged && (
              <span className="text-[10px] font-mono font-bold text-emerald-700">
                Tam Denge
              </span>
            )}
          </div>

          <div className="my-2 min-h-[170px] flex items-center justify-center">
            {isMerged ? (
              modelType === 'circle' ? (
                <CircleModel
                  numerator={stepsInfo.result.numerator}
                  denominator={stepsInfo.result.denominator}
                  interactive={false}
                  color="#10b981"
                  size={170}
                />
              ) : modelType === 'strip' ? (
                <StripModel
                  numerator={stepsInfo.result.numerator}
                  denominator={stepsInfo.result.denominator}
                  interactive={false}
                  color="#10b981"
                />
              ) : (
                <GridModel
                  numerator={stepsInfo.result.numerator}
                  denominator={stepsInfo.result.denominator}
                  interactive={false}
                  color="#10b981"
                  size={170}
                />
              )
            ) : (
              <div className="text-center p-4 text-xs font-mono text-zinc-400 border-2 border-dashed border-zinc-300 rounded-xl">
                {areDenominatorsEqual || isExpanded
                  ? '👆 2. Adıma tıkla ve modelleri birleştir!'
                  : '⚠️ Önce paydaları eşitlemen gerekir'}
              </div>
            )}
          </div>

          <div className="text-center font-mono">
            <div className="text-lg font-black text-emerald-950">
              {isMerged ? (
                <span>
                  {stepsInfo.result.numerator}/{stepsInfo.commonDen}
                  {fractionToString(stepsInfo.simplifiedResult) !== `${stepsInfo.result.numerator}/${stepsInfo.commonDen}` && (
                    <span className="text-zinc-600 text-sm ml-1.5 font-normal">
                      = {fractionToString(stepsInfo.simplifiedResult)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-zinc-400">Henüz Birleştirilmedi</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500">
              {isMerged ? `${stepsInfo.result.numerator} adet (1/${stepsInfo.commonDen}) birleşti` : 'Bekleniyor'}
            </div>
          </div>
        </div>
      </div>

      {/* Adım Adım Akademik İspat Raporu */}
      <div className="paper-card p-4 space-y-2">
        <h4 className="font-mono text-xs font-black text-zinc-900 uppercase tracking-wider">
          İşlem Basamakları Açıklaması:
        </h4>
        <div className="space-y-1.5 font-mono text-xs text-zinc-700">
          {stepsInfo.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 p-1.5 rounded bg-zinc-50 border border-zinc-200">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
