import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Fraction,
  fractionToString,
  toDecimal,
  toMixedFraction,
  simplify,
  FractionModelType,
} from '../engines/fractionEngine';
import {
  CircleModel,
  StripModel,
  GridModel,
  NumberLineModel,
  UnifiedFractionModel,
} from './FractionModels';

export default function FractionWorkshopLab() {
  const [numerator, setNumerator] = useState(3);
  const [denominator, setDenominator] = useState(5);
  const [modelType, setModelType] = useState<FractionModelType>('circle');
  const [showAllModels, setShowAllModels] = useState(false);
  const [displayFormat, setDisplayFormat] = useState<'improper' | 'mixed'>('improper');

  const currentFrac: Fraction = useMemo(() => ({
    numerator,
    denominator,
  }), [numerator, denominator]);

  const decimalVal = toDecimal(currentFrac);
  const percentage = (decimalVal * 100).toFixed(1);
  const simplified = simplify(currentFrac);
  const mixed = toMixedFraction(currentFrac);

  const isImproper = numerator >= denominator;

  // Hızlı Payda Butonları
  const DENOMINATOR_PRESETS = [2, 3, 4, 5, 6, 8, 10, 12, 16];

  // Hedef Keşif Görevleri
  const CHALLENGES = [
    { num: 1, den: 2, label: 'Yarım (1/2)' },
    { num: 3, den: 4, label: 'Üç Çeyrek (3/4)' },
    { num: 5, den: 8, label: '5/8' },
    { num: 5, den: 3, label: 'Bileşik: 5/3 (1 Tam 2/3)' },
    { num: 7, den: 4, label: 'Bileşik: 7/4 (1 Tam 3/4)' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Bilgi Kartı: 1. Bileşenlerin Matematiksel Temsili */}
      <div className="p-4 rounded-xl border-2 border-zinc-900 bg-amber-50/70 shadow-[2px_2px_0px_#18181b]">
        <div className="flex items-start gap-2.5">
          <span className="text-2xl">🔬</span>
          <div>
            <h3 className="font-mono font-black text-sm text-zinc-900">
              Kesir Atölyesi: Bütün-Parça ve Birim Kesir İnşası
            </h3>
            <p className="text-xs text-zinc-700 mt-1 leading-relaxed">
              <strong>Bütün (Referans Alanı)</strong> 1 tamdır. <strong>Payda (Bölüntü Derecesi)</strong> bütünün kaç eş parçaya ayrıldığını,{' '}
              <strong>Pay (Etkin Parçalar)</strong> ise kaç birim kesrin seçildiğini gösterir.{' '}
              Modele tıklayarak doğrudan dilimleri boyayabilir veya boşaltabilirsin!
            </p>
          </div>
        </div>
      </div>

      {/* Model Seçim Çubuğu ve Çoklu İnceleme Düğmesi */}
      <div className="paper-card p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-200 pb-3">
          <span className="text-xs font-mono font-bold text-zinc-600 uppercase">
            Model Temsil Türü:
          </span>

          <div className="flex items-center gap-2 flex-wrap">
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
                  onClick={() => {
                    setModelType(m.id as FractionModelType);
                    setShowAllModels(false);
                  }}
                  className={`px-3 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                    !showAllModels && modelType === m.id
                      ? 'bg-zinc-900 text-white shadow-[1px_1px_0px_#18181b]'
                      : 'bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAllModels(!showAllModels)}
              className={`px-3 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                showAllModels
                  ? 'bg-blue-600 text-white shadow-[2px_2px_0px_#1e3a8a]'
                  : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
              }`}
            >
              <span>👁️</span> Dördünü Birlikte Kıyasla
            </button>
          </div>
        </div>

        {/* Payda (Bölüntü Derecesi) ve Pay (Etkin Parçalar) Kontrolleri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payda Kontrolü */}
          <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-zinc-50 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold text-zinc-700">
                1. Payda (Bölüntü Derecesi):
              </label>
              <span className="font-mono text-base font-black text-zinc-950 px-2.5 py-0.5 rounded bg-white border border-zinc-900">
                {denominator} Eş Parça
              </span>
            </div>

            {/* Hızlı Butonlar */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DENOMINATOR_PRESETS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDenominator(d)}
                  className={`w-8 h-8 rounded-lg border-2 border-zinc-900 font-mono text-xs font-black transition-all ${
                    denominator === d
                      ? 'bg-amber-400 text-zinc-950 shadow-[1px_1px_0px_#18181b] scale-105'
                      : 'bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-zinc-500 font-mono">
              Birim kesir boyutu: <strong>1/{denominator}</strong>
            </p>
          </div>

          {/* Pay Kontrolü */}
          <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-zinc-50 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold text-zinc-700">
                2. Pay (Etkin / Taranan Parçalar):
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNumerator(n => Math.max(0, n - 1))}
                  className="w-7 h-7 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-100 font-black text-sm flex items-center justify-center active:scale-95 shadow-sm"
                >
                  −
                </button>
                <span className="font-mono text-base font-black text-blue-900 px-3 py-0.5 rounded bg-white border border-zinc-900">
                  {numerator}
                </span>
                <button
                  type="button"
                  onClick={() => setNumerator(n => Math.min(denominator * 3, n + 1))}
                  className="w-7 h-7 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-100 font-black text-sm flex items-center justify-center active:scale-95 shadow-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={denominator * 2}
              value={numerator}
              onChange={e => setNumerator(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0 (Boş)</span>
              <span>{denominator} (1 Bütün)</span>
              <span>{denominator * 2} (2 Bütün)</span>
            </div>
          </div>
        </div>

        {/* Hızlı Keşif Görevleri */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-200">
          <span className="text-xs font-mono font-bold text-zinc-500 mr-1">Örnek Kesirler:</span>
          {CHALLENGES.map((ch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setNumerator(ch.num);
                setDenominator(ch.den);
              }}
              className="px-2.5 py-0.5 rounded-lg border border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 font-mono text-xs font-bold transition-all"
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ana Görselleştirme Sahnesi */}
      <div className="paper-card p-6">
        {showAllModels ? (
          /* 4 Modelin Senkron Karşılaştırmalı Görünümü */
          <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-2 text-center">
              <h3 className="font-mono font-black text-sm text-zinc-900">
                Senkron 4 Model Kıyaslaması ({numerator}/{denominator})
              </h3>
              <p className="text-xs text-zinc-500 font-mono">
                Aynı rasyonel değerin 4 farklı geometrik ve doğrusal temsili:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="p-4 rounded-xl border-2 border-zinc-900 bg-amber-50/40 flex flex-col items-center">
                <span className="font-mono text-xs font-bold text-amber-900 mb-2">🟡 1. Dairesel Alan Modeli</span>
                <CircleModel
                  numerator={numerator}
                  denominator={denominator}
                  onSetNumerator={setNumerator}
                  color="#f59e0b"
                  size={190}
                />
              </div>

              <div className="p-4 rounded-xl border-2 border-zinc-900 bg-blue-50/40 flex flex-col items-center">
                <span className="font-mono text-xs font-bold text-blue-900 mb-2">📏 2. Doğrusal Kesir Şeridi</span>
                <StripModel
                  numerator={numerator}
                  denominator={denominator}
                  onSetNumerator={setNumerator}
                  color="#3b82f6"
                />
              </div>

              <div className="p-4 rounded-xl border-2 border-zinc-900 bg-emerald-50/40 flex flex-col items-center">
                <span className="font-mono text-xs font-bold text-emerald-900 mb-2">🔲 3. Kare / Izgara Alan Modeli</span>
                <GridModel
                  numerator={numerator}
                  denominator={denominator}
                  onSetNumerator={setNumerator}
                  color="#10b981"
                  size={190}
                />
              </div>

              <div className="p-4 rounded-xl border-2 border-zinc-900 bg-purple-50/40 flex flex-col items-center">
                <span className="font-mono text-xs font-bold text-purple-900 mb-2">📈 4. Sayı Doğrusu Modeli</span>
                <NumberLineModel
                  numerator={numerator}
                  denominator={denominator}
                  onSetNumerator={setNumerator}
                  color="#8b5cf6"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Tek Aktif Model Sahnesi */
          <div className="flex flex-col items-center justify-center min-h-[260px] py-4">
            <UnifiedFractionModel
              modelType={modelType}
              numerator={numerator}
              denominator={denominator}
              onSetNumerator={setNumerator}
              interactive={true}
              size={230}
            />
            <span className="text-xs font-mono text-zinc-400 mt-4">
              👆 Dilimlere tıklayarak parça ekleyebilir veya çıkarabilirsin
            </span>
          </div>
        )}
      </div>

      {/* Matematiksel Değerler ve Birim Kesir Hiyerarşisi Paneli */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Kesir Gösterimi (Bileşik veya Tam Sayılı) */}
        <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-white text-center shadow-[2px_2px_0px_#18181b]">
          <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
            {isImproper && numerator !== denominator ? (
              <button
                type="button"
                onClick={() => setDisplayFormat(f => f === 'improper' ? 'mixed' : 'improper')}
                className="text-blue-700 underline hover:text-blue-900"
              >
                {displayFormat === 'improper' ? 'Tam Sayılıya Çevir ⟳' : 'Bileşiğe Çevir ⟳'}
              </button>
            ) : (
              'Kesir Değeri'
            )}
          </div>
          <div className="font-mono text-2xl font-black text-zinc-950 mt-1">
            {displayFormat === 'mixed' && isImproper && mixed.remainder.numerator > 0 ? (
              <span>
                {mixed.whole} <span className="text-blue-700">{mixed.remainder.numerator}/{mixed.remainder.denominator}</span>
              </span>
            ) : (
              `${numerator}/${denominator}`
            )}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {numerator === denominator
              ? '1 Tam Bütün'
              : numerator > denominator
              ? `${Math.floor(numerator / denominator)} Tam + ${numerator % denominator}/${denominator}`
              : 'Basit Kesir'}
          </div>
        </div>

        {/* Birim Kesir Hiyerarşisi */}
        <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-white text-center shadow-[2px_2px_0px_#18181b]">
          <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
            Birim Kesir Hiyerarşisi
          </div>
          <div className="font-mono text-2xl font-black text-amber-600 mt-1">
            1/{denominator}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {numerator} adet 1/{denominator} birleşti
          </div>
        </div>

        {/* Sadeleşmiş Değer */}
        <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-white text-center shadow-[2px_2px_0px_#18181b]">
          <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
            Sadeleşmiş Değer
          </div>
          <div className="font-mono text-2xl font-black text-emerald-700 mt-1">
            {fractionToString(simplified)}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {fractionToString(simplified) === `${numerator}/${denominator}`
              ? 'En sade halinde'
              : `Denk kesir: ${numerator}/${denominator} = ${fractionToString(simplified)}`}
          </div>
        </div>

        {/* Ondalık ve Yüzde Oranı */}
        <div className="p-3.5 rounded-xl border-2 border-zinc-900 bg-white text-center shadow-[2px_2px_0px_#18181b]">
          <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
            Oransal Değer (Ondalık / Yüzde)
          </div>
          <div className="font-mono text-2xl font-black text-purple-700 mt-1">
            %{percentage}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Ondalık: {decimalVal.toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}
