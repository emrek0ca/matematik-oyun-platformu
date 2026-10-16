import React from 'react';
import { motion } from 'framer-motion';
import {
  Fraction,
  fractionToString,
  toDecimal,
  getGridDimensions,
  FractionModelType,
} from '../engines/fractionEngine';

export interface FractionModelProps {
  numerator: number;
  denominator: number;
  interactive?: boolean;
  onSetNumerator?: (val: number) => void;
  color?: string;
  size?: number;
  showLabels?: boolean;
}

/**
 * 1. DAİRESEL KESİR MODELİ (Pasta / Pizza Modeli)
 * Bütün (1 tam) daire şeklinde referans alanıdır.
 * Payda kadar eş dilime bölünür, pay kadar dilim boyanır.
 * Bileşik ve tam sayılı kesirler için (>1) birden fazla bütün yan yana çizilir.
 */
export function CircleModel({
  numerator,
  denominator,
  interactive = true,
  onSetNumerator,
  color = '#f59e0b',
  size = 200,
  showLabels = true,
}: FractionModelProps) {
  const safeDen = Math.max(1, denominator);
  const safeNum = Math.max(0, numerator);

  // Kaç tane bütün daire çizilecek? (Bileşik kesir mekanizması)
  const totalWholes = Math.max(1, Math.ceil(safeNum / safeDen));
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  function arcPath(startAngle: number, endAngle: number): string {
    const angleDiff = endAngle - startAngle;
    if (angleDiff >= 2 * Math.PI - 0.001) {
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angleDiff > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  const anglePerSlice = (2 * Math.PI) / safeDen;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {Array.from({ length: totalWholes }, (_, wIdx) => {
        // Bu bütündeki pay aralığı: [wIdx * safeDen, (wIdx + 1) * safeDen]
        const wholeOffset = wIdx * safeDen;
        const filledInThisWhole = Math.max(0, Math.min(safeDen, safeNum - wholeOffset));

        return (
          <div key={wIdx} className="flex flex-col items-center">
            {totalWholes > 1 && (
              <span className="text-[11px] font-mono font-bold text-zinc-500 mb-1">
                {wIdx + 1}. Bütün {filledInThisWhole === safeDen ? '(Tam Dolu)' : `(${filledInThisWhole}/${safeDen})`}
              </span>
            )}

            <div className="relative">
              <svg width={size} height={size} className="overflow-visible select-none">
                {/* Daire Tabanı (1 Tam Bütün) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 3}
                  fill="#ffffff"
                  stroke="#18181b"
                  strokeWidth="2.5"
                />

                {/* Dilimler */}
                {Array.from({ length: safeDen }, (_, sIdx) => {
                  const globalIdx = wholeOffset + sIdx;
                  const isFilled = globalIdx < safeNum;
                  const startAngle = -Math.PI / 2 + sIdx * anglePerSlice;
                  const endAngle = startAngle + anglePerSlice;
                  const path = arcPath(startAngle, endAngle);

                  // Dilim merkezi (Birim kesir etiketi için)
                  const midAngle = startAngle + anglePerSlice / 2;
                  const labelR = r * 0.62;
                  const lx = cx + labelR * Math.cos(midAngle);
                  const ly = cy + labelR * Math.sin(midAngle);

                  return (
                    <g key={sIdx}>
                      <motion.path
                        d={path}
                        fill={isFilled ? color : '#fdfdfc'}
                        stroke="#18181b"
                        strokeWidth="1.8"
                        initial={false}
                        animate={{
                          fill: isFilled ? color : '#fdfdfc',
                          scale: isFilled ? 1 : 0.99,
                        }}
                        transition={{ duration: 0.15 }}
                        className={`${interactive ? 'cursor-pointer hover:opacity-85' : ''}`}
                        onClick={() => {
                          if (!interactive || !onSetNumerator) return;
                          // Eğer tıklandığında zaten doluysa o dilime kadar eksilt; boşsa o dilime kadar doldur
                          if (globalIdx === safeNum - 1) {
                            onSetNumerator(safeNum - 1);
                          } else {
                            onSetNumerator(globalIdx + 1);
                          }
                        }}
                      >
                        <title>{`${sIdx + 1}. Birim Dilim (1/${safeDen})`}</title>
                      </motion.path>

                      {/* Birim Kesir Etiketi (1/d) */}
                      {showLabels && safeDen <= 12 && (
                        <text
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={safeDen <= 6 ? 11 : 9}
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill={isFilled ? '#ffffff' : '#71717a'}
                          pointerEvents="none"
                          className="drop-shadow-sm select-none"
                        >
                          1/{safeDen}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Merkez Pivot Noktası */}
                <circle cx={cx} cy={cy} r={3.5} fill="#18181b" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 2. DOĞRUSAL KESİR ŞERİDİ MODELİ (Fraction Strip / Bar Modeli)
 * Dikdörtgen şerit 1 tam bütünü temsil eder.
 * Dikey çizgilerle payda kadar eş dikdörtgen parçaya bölünür.
 * Her parçanın içinde 1/payda birim kesir değeri yazar.
 */
export function StripModel({
  numerator,
  denominator,
  interactive = true,
  onSetNumerator,
  color = '#3b82f6',
  showLabels = true,
}: FractionModelProps) {
  const safeDen = Math.max(1, denominator);
  const safeNum = Math.max(0, numerator);
  const totalWholes = Math.max(1, Math.ceil(safeNum / safeDen));

  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      {Array.from({ length: totalWholes }, (_, wIdx) => {
        const wholeOffset = wIdx * safeDen;
        const filledInThisWhole = Math.max(0, Math.min(safeDen, safeNum - wholeOffset));

        return (
          <div key={wIdx} className="space-y-1">
            {totalWholes > 1 && (
              <div className="flex justify-between text-xs font-mono font-bold text-zinc-500">
                <span>{wIdx + 1}. Bütün</span>
                <span>{filledInThisWhole} / {safeDen} Dolu</span>
              </div>
            )}

            <div className="w-full h-14 bg-white border-2 border-zinc-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_#18181b] flex">
              {Array.from({ length: safeDen }, (_, sIdx) => {
                const globalIdx = wholeOffset + sIdx;
                const isFilled = globalIdx < safeNum;

                return (
                  <motion.button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      if (!interactive || !onSetNumerator) return;
                      if (globalIdx === safeNum - 1) {
                        onSetNumerator(safeNum - 1);
                      } else {
                        onSetNumerator(globalIdx + 1);
                      }
                    }}
                    disabled={!interactive}
                    initial={false}
                    animate={{
                      backgroundColor: isFilled ? color : '#ffffff',
                    }}
                    transition={{ duration: 0.15 }}
                    style={{ width: `${100 / safeDen}%` }}
                    className={`h-full border-r last:border-r-0 border-zinc-900 flex flex-col items-center justify-center font-mono font-bold transition-all relative group ${
                      interactive ? 'hover:brightness-95 active:scale-95' : ''
                    }`}
                  >
                    {/* Birim Kesir Değeri */}
                    {showLabels && (
                      <span
                        className={`text-xs sm:text-sm font-black transition-colors ${
                          isFilled ? 'text-white drop-shadow' : 'text-zinc-600'
                        }`}
                      >
                        1/{safeDen}
                      </span>
                    )}

                    {/* Sıra Numarası Rozeti */}
                    <span
                      className={`text-[9px] font-mono transition-colors ${
                        isFilled ? 'text-white/80' : 'text-zinc-400'
                      }`}
                    >
                      {sIdx + 1}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 3. KARE / IZGARA ALAN MODELİ (Grid Area Modeli)
 * Birim kare alan 1 tam bütünü temsil eder.
 * Payda değerine göre satır ve sütun çizgileriyle eş dikdörtgen alanlara ayrılır.
 */
export function GridModel({
  numerator,
  denominator,
  interactive = true,
  onSetNumerator,
  color = '#10b981',
  size = 210,
  showLabels = true,
}: FractionModelProps) {
  const safeDen = Math.max(1, denominator);
  const safeNum = Math.max(0, numerator);
  const totalWholes = Math.max(1, Math.ceil(safeNum / safeDen));
  const { rows, cols } = getGridDimensions(safeDen);

  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      {Array.from({ length: totalWholes }, (_, wIdx) => {
        const wholeOffset = wIdx * safeDen;
        const filledInThisWhole = Math.max(0, Math.min(safeDen, safeNum - wholeOffset));

        return (
          <div key={wIdx} className="flex flex-col items-center">
            {totalWholes > 1 && (
              <span className="text-[11px] font-mono font-bold text-zinc-500 mb-1">
                {wIdx + 1}. Bütün ({filledInThisWhole}/{safeDen})
              </span>
            )}

            <div
              style={{
                width: size,
                height: size,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              }}
              className="bg-white border-2 border-zinc-900 rounded-xl overflow-hidden shadow-[3px_3px_0px_#18181b]"
            >
              {Array.from({ length: safeDen }, (_, sIdx) => {
                const globalIdx = wholeOffset + sIdx;
                const isFilled = globalIdx < safeNum;

                return (
                  <motion.button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      if (!interactive || !onSetNumerator) return;
                      if (globalIdx === safeNum - 1) {
                        onSetNumerator(safeNum - 1);
                      } else {
                        onSetNumerator(globalIdx + 1);
                      }
                    }}
                    disabled={!interactive}
                    animate={{
                      backgroundColor: isFilled ? color : '#ffffff',
                    }}
                    transition={{ duration: 0.15 }}
                    className={`border border-zinc-900/60 flex flex-col items-center justify-center p-0.5 select-none transition-all ${
                      interactive ? 'hover:brightness-95 active:scale-95' : ''
                    }`}
                  >
                    {showLabels && safeDen <= 16 && (
                      <span
                        className={`font-mono text-[10px] sm:text-xs font-black ${
                          isFilled ? 'text-white drop-shadow' : 'text-zinc-600'
                        }`}
                      >
                        1/{safeDen}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="text-[10px] text-zinc-400 font-mono mt-1">
              {rows} × {cols} Izgara ({safeDen} Eş Kare)
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 4. SAYI DOĞRUSU MODELİ (Number Line Modeli)
 * [0, 1] veya [0, 2] aralığı eşit adımlara bölünür.
 * Birim kesir sıçramaları (jump arc) ve kesir iğnesi ile kesin konumu gösterir.
 */
export function NumberLineModel({
  numerator,
  denominator,
  interactive = true,
  onSetNumerator,
  color = '#8b5cf6',
}: FractionModelProps) {
  const safeDen = Math.max(1, denominator);
  const safeNum = Math.max(0, numerator);

  // Kaç tam aralık gösterilecek? (En az 1 tam, gerekiyorsa 2 veya 3)
  const maxWhole = Math.max(1, Math.ceil(safeNum / safeDen));
  const totalUnits = maxWhole;
  const totalSteps = totalUnits * safeDen;

  const width = 540;
  const height = 120;
  const padX = 40;
  const axisY = 70;
  const innerWidth = width - 2 * padX;
  const stepWidth = innerWidth / totalSteps;

  const currentX = padX + (safeNum / totalSteps) * innerWidth;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible select-none">
        {/* Vurgulu İlerleme Çizgisi (0'dan kesre kadar) */}
        <line
          x1={padX}
          y1={axisY}
          x2={currentX}
          y2={axisY}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Ana Sayı Doğrusu Ekseni */}
        <line
          x1={padX - 15}
          y1={axisY}
          x2={width - padX + 15}
          y2={axisY}
          stroke="#18181b"
          strokeWidth="2.5"
        />

        {/* Sol ve Sağ Ok Uçları */}
        <polygon
          points={`${padX - 18},${axisY} ${padX - 10},${axisY - 4} ${padX - 10},${axisY + 4}`}
          fill="#18181b"
        />
        <polygon
          points={`${width - padX + 18},${axisY} ${width - padX + 10},${axisY - 4} ${width - padX + 10},${axisY + 4}`}
          fill="#18181b"
        />

        {/* Birim Kesir Sıçrama Yayları (0'dan n'e kadar her 1/d adımı) */}
        {Array.from({ length: safeNum }, (_, i) => {
          const xStart = padX + i * stepWidth;
          const xEnd = padX + (i + 1) * stepWidth;
          const xMid = (xStart + xEnd) / 2;
          const arcHeight = Math.min(26, stepWidth * 0.7);

          return (
            <g key={i}>
              <path
                d={`M ${xStart} ${axisY - 4} Q ${xMid} ${axisY - 4 - arcHeight} ${xEnd} ${axisY - 4}`}
                fill="none"
                stroke={color}
                strokeWidth="1.6"
                strokeDasharray="3 2"
              />
              {stepWidth > 28 && (
                <text
                  x={xMid}
                  y={axisY - 4 - arcHeight / 2}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill={color}
                >
                  +1/{safeDen}
                </text>
              )}
            </g>
          );
        })}

        {/* Bölüntü Çizgileri ve Etiketler */}
        {Array.from({ length: totalSteps + 1 }, (_, step) => {
          const x = padX + step * stepWidth;
          const isMajor = step % safeDen === 0;
          const wholeVal = step / safeDen;

          return (
            <g
              key={step}
              className={interactive ? 'cursor-pointer group' : ''}
              onClick={() => {
                if (interactive && onSetNumerator) {
                  onSetNumerator(step);
                }
              }}
            >
              {/* Tıklama Hitbox'ı */}
              {interactive && (
                <rect
                  x={x - stepWidth / 2}
                  y={axisY - 24}
                  width={stepWidth}
                  height={48}
                  fill="transparent"
                />
              )}

              {/* Çentik Çizgisi */}
              <line
                x1={x}
                y1={axisY - (isMajor ? 14 : 7)}
                x2={x}
                y2={axisY + (isMajor ? 14 : 7)}
                stroke="#18181b"
                strokeWidth={isMajor ? 2.5 : 1.5}
              />

              {/* Tam Sayı Etiketleri (0, 1, 2) */}
              {isMajor && (
                <text
                  x={x}
                  y={axisY + 30}
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontSize="14"
                  fontWeight="900"
                  fill="#18181b"
                >
                  {wholeVal}
                </text>
              )}

              {/* Kesir Etiketleri (Örn: 1/4, 2/4, 3/4) */}
              {!isMajor && totalSteps <= 16 && (
                <text
                  x={x}
                  y={axisY + 22}
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#71717a"
                >
                  {step % safeDen}/{safeDen}
                </text>
              )}
            </g>
          );
        })}

        {/* Kesir Konum İğnesi / Pin Rozeti */}
        <g transform={`translate(${currentX}, ${axisY})`}>
          <circle cx={0} cy={0} r={7} fill={color} stroke="#18181b" strokeWidth="2.5" />
          <circle cx={0} cy={0} r={2.5} fill="#ffffff" />

          {/* İğne Üzerindeki Değer Bayrağı */}
          <g transform="translate(0, -32)">
            <rect
              x="-26"
              y="-12"
              width="52"
              height="20"
              rx="6"
              fill="#18181b"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="2"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="900"
              fill="#ffffff"
            >
              {safeNum}/{safeDen}
            </text>
          </g>
        </g>
      </svg>

      <span className="text-[11px] font-mono text-zinc-500 mt-1">
        (Doğru üzerindeki çentiklere tıklayarak kesir değerini anında değiştirebilirsin)
      </span>
    </div>
  );
}

/**
 * 5. BİRLEŞİK PEDAGOJİK KESİR MODELİ
 * Seçilen model türüne (Daire, Şerit, Izgara, Sayı Doğrusu) göre otomatik render eder.
 */
export function UnifiedFractionModel({
  modelType,
  numerator,
  denominator,
  interactive = true,
  onSetNumerator,
  color,
  size,
  showLabels = true,
}: FractionModelProps & { modelType: FractionModelType }) {
  switch (modelType) {
    case 'circle':
      return (
        <CircleModel
          numerator={numerator}
          denominator={denominator}
          interactive={interactive}
          onSetNumerator={onSetNumerator}
          color={color || '#f59e0b'}
          size={size || 210}
          showLabels={showLabels}
        />
      );
    case 'strip':
      return (
        <StripModel
          numerator={numerator}
          denominator={denominator}
          interactive={interactive}
          onSetNumerator={onSetNumerator}
          color={color || '#3b82f6'}
          showLabels={showLabels}
        />
      );
    case 'grid':
      return (
        <GridModel
          numerator={numerator}
          denominator={denominator}
          interactive={interactive}
          onSetNumerator={onSetNumerator}
          color={color || '#10b981'}
          size={size || 210}
          showLabels={showLabels}
        />
      );
    case 'numberline':
      return (
        <NumberLineModel
          numerator={numerator}
          denominator={denominator}
          interactive={interactive}
          onSetNumerator={onSetNumerator}
          color={color || '#8b5cf6'}
        />
      );
  }
}
