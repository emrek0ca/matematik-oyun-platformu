import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Fraction,
  fraction,
  fractionToString,
  simplify,
  toDecimal,
  FractionModelType,
} from '../engines/fractionEngine';
import { CircleModel, StripModel, GridModel, NumberLineModel } from './FractionModels';

export default function EquivalenceSimulator() {
  const [baseNum, setBaseNum] = useState(2);
  const [baseDen, setBaseDen] = useState(3);
  const [multiplier, setMultiplier] = useState(2);
  const [modelType, setModelType] = useState<FractionModelType>('circle');

  const baseFraction: Fraction = useMemo(() => {
    return { numerator: baseNum, denominator: baseDen };
  }, [baseNum, baseDen]);

  const expandedFraction: Fraction = useMemo(() => {
    return {
      numerator: baseNum * multiplier,
      denominator: baseDen * multiplier,
    };
  }, [baseNum, baseDen, multiplier]);

  const decimalVal = toDecimal(baseFraction);
  const percentage = (decimalVal * 100).toFixed(1);

  // Sadeleştirilebilir mi kontrolü
  const canSimplify = useMemo(() => {
    const s = simplify(baseFraction);
    return s.denominator < baseFraction.denominator;
  }, [baseFraction]);

  const handleSimplifyBase = () => {
    const s = simplify(baseFraction);
    setBaseNum(s.numerator);
    setBaseDen(s.denominator);
  };

  const PRESETS: Array<{ num: number; den: number; label: string }> = [
    { num: 1, den: 2, label: '1/2' },
    { num: 2, den: 3, label: '2/3' },
    { num: 3, den: 4, label: '3/4' },
    { num: 2, den: 5, label: '2/5' },
    { num: 4, den: 6, label: '4/6' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Bilgi Kartı: Pedagojik Teorem */}
      <div className="p-4 rounded-xl border-2 border-zinc-900 bg-amber-50/70 shadow-[2px_2px_0px_#18181b]">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-mono font-black text-sm text-zinc-900">
              Denk Kesir Teoremi (Alan Sabitliği Kuralı)
            </h3>
            <p className="text-xs text-zinc-700 mt-1 leading-relaxed">
              Bir kesrin pay ve paydası aynı sıfırdan farklı sayıyla çarpıldığında (genişletme) veya bölündüğünde (sadeleştirme),{' '}
              <strong>geometrik alan büyüklüğü kesinlikle değişmez</strong>. Sadece bütün daha küçük alt dilimlere ayrılır ve taranan parça sayısı aynı oranda artar!
            </p>
          </div>
        </div>
      </div>

      {/* Kontrol Paneli: Model Türü, Baz Kesir ve Genişletme Çarpanı */}
      <div className="paper-card p-4 space-y-4">
        {/* Model Türü Seçici */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-200 pb-3">
          <span className="text-xs font-mono font-bold text-zinc-600 uppercase">
            Geometrik Model Seçimi:
          </span>
          <div className="flex gap-1.5">
            {[
              { id: 'circle', icon: '🟡', label: 'Daire' },
              { id: 'strip', icon: '📏', label: 'Şerit' },
              { id: 'grid', icon: '🔲', label: 'Izgara' },
              { id: 'numberline', icon: '📈', label: 'Sayı Doğrusu' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelType(m.id as FractionModelType)}
                className={`px-3 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                  modelType === m.id
                    ? 'bg-zinc-900 text-white shadow-[1px_1px_0px_#18181b]'
                    : 'bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Baz Kesir ve Hazır Şablonlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs font-mono font-bold text-zinc-600 block mb-1.5">
              Hızlı Kesir Şablonları:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setBaseNum(p.num);
                    setBaseDen(p.den);
                  }}
                  className={`px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold transition-all ${
                    baseNum === p.num && baseDen === p.den
                      ? 'bg-amber-400 text-zinc-950 shadow-[1px_1px_0px_#18181b]'
                      : 'bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {canSimplify && (
                <button
                  type="button"
                  onClick={handleSimplifyBase}
                  className="px-2.5 py-1 rounded-lg border-2 border-emerald-700 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-mono text-xs font-black shadow-[1px_1px_0px_#047857] flex items-center gap-1"
                >
                  <span>✂️ En Sade Hale İndirge</span>
                </button>
              )}
            </div>
          </div>

          {/* Genişletme Çarpanı (k) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-mono font-bold text-zinc-600">
                Bölüntü Çizgisini Çoğalt (Genişletme Çarpanı):
              </label>
              <span className="font-mono text-sm font-black text-blue-700 px-2 py-0.5 rounded bg-blue-100 border border-blue-300">
                × {multiplier} Kat
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMultiplier(k)}
                  className={`flex-1 py-1.5 rounded-lg border-2 border-zinc-900 font-mono text-xs font-black transition-all ${
                    multiplier === k
                      ? 'bg-blue-600 text-white shadow-[2px_2px_0px_#1e3a8a] scale-105'
                      : 'bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  ×{k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Karşılaştırmalı Canlı İspat Sahnesi (Yan Yana Birebir Eşitlik) */}
      <div className="paper-card grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 items-center">
        {/* Sol Panel: Orijinal Kesir */}
        <div className="flex flex-col items-center p-4 rounded-2xl border-2 border-zinc-900 bg-zinc-50/70 relative">
          <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full border border-zinc-900 bg-white font-mono text-[11px] font-bold text-zinc-700 shadow-sm">
            1. Temel Kesir
          </div>

          <div className="my-6 min-h-[220px] flex items-center justify-center">
            {modelType === 'circle' && (
              <CircleModel
                numerator={baseNum}
                denominator={baseDen}
                interactive={false}
                color="#f59e0b"
                size={210}
              />
            )}
            {modelType === 'strip' && (
              <StripModel
                numerator={baseNum}
                denominator={baseDen}
                interactive={false}
                color="#f59e0b"
              />
            )}
            {modelType === 'grid' && (
              <GridModel
                numerator={baseNum}
                denominator={baseDen}
                interactive={false}
                color="#f59e0b"
                size={210}
              />
            )}
            {modelType === 'numberline' && (
              <NumberLineModel
                numerator={baseNum}
                denominator={baseDen}
                interactive={false}
                color="#f59e0b"
              />
            )}
          </div>

          {/* Kesir Değer Kartı */}
          <div className="w-full p-3 rounded-xl border-2 border-zinc-900 bg-white text-center space-y-1">
            <div className="font-mono text-2xl font-black text-zinc-950">
              {baseNum} / {baseDen}
            </div>
            <div className="text-xs font-mono text-zinc-500">
              {baseDen} parçanın {baseNum}'si boyalı ({percentage}% Alan)
            </div>
          </div>
        </div>

        {/* Sağ Panel: Genişletilmiş Denk Kesir */}
        <div className="flex flex-col items-center p-4 rounded-2xl border-2 border-zinc-900 bg-blue-50/40 relative">
          <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full border border-blue-900 bg-blue-100 font-mono text-[11px] font-black text-blue-950 shadow-sm">
            2. Genişletilmiş Denk Kesir (×{multiplier})
          </div>

          <div className="my-6 min-h-[220px] flex items-center justify-center">
            {modelType === 'circle' && (
              <CircleModel
                numerator={expandedFraction.numerator}
                denominator={expandedFraction.denominator}
                interactive={false}
                color="#3b82f6"
                size={210}
              />
            )}
            {modelType === 'strip' && (
              <StripModel
                numerator={expandedFraction.numerator}
                denominator={expandedFraction.denominator}
                interactive={false}
                color="#3b82f6"
              />
            )}
            {modelType === 'grid' && (
              <GridModel
                numerator={expandedFraction.numerator}
                denominator={expandedFraction.denominator}
                interactive={false}
                color="#3b82f6"
                size={210}
              />
            )}
            {modelType === 'numberline' && (
              <NumberLineModel
                numerator={expandedFraction.numerator}
                denominator={expandedFraction.denominator}
                interactive={false}
                color="#3b82f6"
              />
            )}
          </div>

          {/* Kesir Değer Kartı */}
          <div className="w-full p-3 rounded-xl border-2 border-blue-900 bg-white text-center space-y-1">
            <div className="font-mono text-2xl font-black text-blue-900">
              {expandedFraction.numerator} / {expandedFraction.denominator}
            </div>
            <div className="text-xs font-mono text-blue-700">
              {expandedFraction.denominator} parçanın {expandedFraction.numerator}'si boyalı ({percentage}% Alan)
            </div>
          </div>
        </div>
      </div>

      {/* Matematiksel Eşitlik İspat Bandı */}
      <div className="p-4 rounded-2xl border-2 border-zinc-900 bg-emerald-50 text-center space-y-2 shadow-[2px_2px_0px_#18181b]">
        <div className="flex items-center justify-center gap-3 font-mono text-lg sm:text-2xl font-black text-zinc-950 flex-wrap">
          <span>{baseNum} / {baseDen}</span>
          <span className="text-zinc-500">=</span>
          <span className="text-blue-800">
            ({baseNum} × {multiplier}) / ({baseDen} × {multiplier})
          </span>
          <span className="text-zinc-500">=</span>
          <span className="text-emerald-800">
            {expandedFraction.numerator} / {expandedFraction.denominator}
          </span>
          <span className="text-emerald-700 text-sm font-bold px-2 py-0.5 rounded-full border border-emerald-600 bg-emerald-100">
            ✓ ALAN TAM EŞİT
          </span>
        </div>
        <p className="text-xs font-mono text-emerald-900">
          Her iki modelde de taranan toplam alan <strong>%{percentage}</strong> oranındadır. Parçaların sayısı {multiplier} katına çıktı, ancak her bir parçanın boyutu da {multiplier} kat küçüldüğü için toplam değer kesinlikle sabit kaldı!
        </p>
      </div>
    </div>
  );
}
