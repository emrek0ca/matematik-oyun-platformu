import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/gameStore';
import {
  Fraction,
  fraction,
  add,
  subtract,
  compare,
  fractionToString,
  toDecimal,
  generatePizzaChallenge,
  PizzaOrderChallenge,
  PizzaSliceOption,
} from '../engines/fractionEngine';
import FractionCirclesArea from '../components/FractionCirclesArea';
import FractionBarsArea from '../components/FractionBarsArea';
import FractionNumberLineArea from '../components/FractionNumberLineArea';
import FractionOperationsArea from '../components/FractionOperationsArea';

type WorkshopTab = 'circles' | 'bars' | 'numberline' | 'operations' | 'pizza';
type Difficulty = 'kolay' | 'orta' | 'zor';

interface FractionConcepts {
  partWhole: number;       // Bütün ve Parça İlişkisi
  unitFractions: number;   // Birim Kesirler (1/d)
  equivalence: number;     // Denk Kesirler
  numberLine: number;      // Sayı Doğrusu
  operations: number;      // Toplama ve Çıkarma
}

// Dairesel Pizza Tepsisi Çizici (Pizza Şefi Modu İçin)
function PizzaTray({
  traySlices,
  target,
  onRemoveSlice,
  size = 230,
}: {
  traySlices: PizzaSliceOption[];
  target: Fraction;
  onRemoveSlice: (index: number) => void;
  size?: number;
}) {
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

  let currentAngle = -Math.PI / 2;
  const renderedSlices = traySlices.map((s, idx) => {
    const sliceAngle = toDecimal(s.fraction) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    return {
      ...s,
      idx,
      startAngle,
      endAngle,
      path: arcPath(startAngle, endAngle),
    };
  });

  let totalTray = fraction(0, 1);
  traySlices.forEach(s => {
    totalTray = add(totalTray, s.fraction);
  });
  const isMatch = compare(totalTray, target) === 0;
  const isOver = compare(totalTray, target) === 1;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width={size}
          height={size}
          className={`transition-transform duration-200 ${isMatch ? 'scale-105' : ''}`}
        >
          {/* Tepsi Dış Kenarı */}
          <circle
            cx={cx}
            cy={cy}
            r={r + 8}
            fill="#fefcf8"
            stroke="#18181b"
            strokeWidth="3"
            strokeDasharray={isMatch ? 'none' : '6 3'}
          />

          {/* Pizza Tabanı */}
          <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#e4e4e7" strokeWidth="1.5" />

          {/* Dilimler */}
          {renderedSlices.map(s => (
            <motion.path
              key={`${s.id}-${s.idx}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              d={s.path}
              fill={s.color}
              stroke="#18181b"
              strokeWidth="2"
              onClick={() => onRemoveSlice(s.idx)}
              className="cursor-pointer hover:opacity-85 transition-opacity"
            >
              <title>{s.name} ({fractionToString(s.fraction)}) - Kaldırmak için tıkla</title>
            </motion.path>
          ))}

          {/* Merkez Nokta */}
          <circle cx={cx} cy={cy} r={4} fill="#18181b" />
        </svg>

        {isMatch && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg border-2 border-zinc-900 bg-emerald-400 text-zinc-950 font-black text-xs shadow-[2px_2px_0px_#18181b]"
          >
            ✓ TAM İSABET!
          </motion.div>
        )}
        {isOver && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg border-2 border-zinc-900 bg-rose-400 text-zinc-950 font-black text-[11px] shadow-[1px_1px_0px_#18181b]">
            ⚠️ TAŞTI!
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500 font-mono mt-2">
        {traySlices.length > 0 ? '(Dilime tıklayarak tepsiden çıkarabilirsin)' : 'Boş Tepsi'}
      </div>
    </div>
  );
}

// Mini Dilim Önizleme SVG
function MiniSlicePreview({ f, color, size = 32 }: { f: Fraction; color: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const sliceAngle = Math.min(2 * Math.PI, toDecimal(f) * 2 * Math.PI);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + sliceAngle;

  function path(): string {
    if (sliceAngle >= 2 * Math.PI - 0.01) {
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#18181b" strokeWidth="1" />
      <path d={path()} fill={color} stroke="#18181b" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={1.5} fill="#18181b" />
    </svg>
  );
}

export default function FractionGame() {
  const { setCurrentGame, recordGameResult, playSound } = useAppStore();
  const [activeTab, setActiveTab] = useState<WorkshopTab>('circles');
  const [difficulty, setDifficulty] = useState<Difficulty>('kolay');

  // Rapor & Kurallar Modalları
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Öğrenme İlerlemesi & Kavram Kazanımları
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    totalPoints: 0,
    startTime: Date.now(),
  });
  const [concepts, setConcepts] = useState<FractionConcepts>({
    partWhole: 0,
    unitFractions: 0,
    equivalence: 0,
    numberLine: 0,
    operations: 0,
  });

  // Alanlardan Görev Tamamlama Bildirimi
  const handleAreaTaskCompleted = (points: number) => {
    setStats(s => ({
      ...s,
      tasksCompleted: s.tasksCompleted + 1,
      totalPoints: s.totalPoints + points,
    }));

    setConcepts(c => {
      const next = { ...c };
      if (activeTab === 'circles') {
        next.partWhole += 1;
        next.unitFractions += 1;
      } else if (activeTab === 'bars') {
        next.equivalence += 1;
      } else if (activeTab === 'numberline') {
        next.numberLine += 1;
      } else if (activeTab === 'operations') {
        next.operations += 1;
      }
      return next;
    });

    recordGameResult('fraction', true, points, 20);
  };

  // Arcade Pizza Şefi Durumu
  const [currentChallenge, setCurrentChallenge] = useState<PizzaOrderChallenge | null>(null);
  const [traySlices, setTraySlices] = useState<PizzaSliceOption[]>([]);
  const [isZenMode, setIsZenMode] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const [score, setScore] = useState(0);
  const [shiftTime, setShiftTime] = useState(60);
  const [orderTimeLeft, setOrderTimeLeft] = useState(40);
  const [combo, setCombo] = useState(1);
  const [ordersCompleted, setOrdersCompleted] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [pizzaFeedback, setPizzaFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const nextOrder = useCallback(() => {
    const ch = generatePizzaChallenge(difficulty);
    setCurrentChallenge(ch);
    setTraySlices([]);
    setOrderTimeLeft(ch.timeLimit);
    setHintActive(false);
  }, [difficulty]);

  const startNewShift = useCallback(() => {
    setScore(0);
    setShiftTime(60);
    setCombo(1);
    setOrdersCompleted(0);
    setIsGameOver(false);
    setPizzaFeedback(null);
    setHintActive(false);
    nextOrder();
  }, [nextOrder]);

  useEffect(() => {
    if (activeTab === 'pizza') {
      startNewShift();
    }
  }, [activeTab, startNewShift]);

  // Sayaç ve Zaman Döngüsü (Pizza Şefi modunda)
  useEffect(() => {
    if (activeTab !== 'pizza' || isGameOver || isZenMode) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setShiftTime(t => {
        if (t <= 1) {
          setIsGameOver(true);
          playSound('wrong');
          return 0;
        }
        return t - 1;
      });

      setOrderTimeLeft(ot => {
        if (ot <= 1) {
          playSound('click');
          setCombo(1);
          setPizzaFeedback({ message: 'Müşteri beklemekten sıkılıp gitti! Yeni müşteri geldi.', type: 'info' });
          nextOrder();
          return 30;
        }
        return ot - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab, isGameOver, isZenMode, nextOrder, playSound]);

  function handleAddSlice(slice: PizzaSliceOption) {
    if (isGameOver) return;
    playSound('click');
    setTraySlices(prev => [...prev, slice]);
  }

  function handleRemoveSlice(index: number) {
    playSound('click');
    setTraySlices(prev => prev.filter((_, i) => i !== index));
  }

  function handleClearTray() {
    playSound('click');
    setTraySlices([]);
  }

  let totalTrayFraction = fraction(0, 1);
  traySlices.forEach(s => {
    totalTrayFraction = add(totalTrayFraction, s.fraction);
  });

  const target = currentChallenge ? currentChallenge.target : fraction(1, 1);
  const comparison = compare(totalTrayFraction, target);
  const isMatch = comparison === 0;
  const isOver = comparison === 1;

  const missingIngredient = currentChallenge?.requiredIngredients?.find(req => {
    return !traySlices.some(
      s => s.name === req.name && fractionToString(s.fraction) === fractionToString(req.fraction)
    );
  });
  const allIngredientsMatch = !missingIngredient;
  const isFullyReady = isMatch && allIngredientsMatch;

  function handleDeliverOrder() {
    if (!currentChallenge || isGameOver) return;

    if (isFullyReady) {
      playSound('win');
      const basePoints = 50;
      const earned = basePoints * combo;
      const bonusSeconds = 6;

      setScore(s => s + earned);
      setShiftTime(t => Math.min(99, t + bonusSeconds));
      setCombo(c => Math.min(5, c + 1));
      setOrdersCompleted(n => n + 1);

      setPizzaFeedback({
        message: `Nefis! ${currentChallenge.customerName} bayıldı! +${earned} Puan (+${bonusSeconds}s bonus)`,
        type: 'success',
      });
      recordGameResult('fraction', true, earned, 15);
      nextOrder();
    } else {
      playSound('wrong');
      if (isOver) {
        setPizzaFeedback({ message: 'Pizza çok büyük oldu! Fazla dilimleri tepsiden çıkar.', type: 'error' });
      } else if (!isMatch) {
        const diff = subtract(target, totalTrayFraction);
        setPizzaFeedback({ message: `Eksik var! Hedefe ulaşmak için ${fractionToString(diff)} daha eklemelisin.`, type: 'error' });
      } else if (!allIngredientsMatch && missingIngredient) {
        setPizzaFeedback({
          message: `Kesir toplamı doğru ama malzeme eksik! Müşteri ${missingIngredient.icon} ${missingIngredient.name} istemişti.`,
          type: 'error',
        });
      }
    }
  }

  return (
    <div className="min-h-screen pb-16 bg-stone-50 select-none font-sans text-zinc-900">
      {/* ======================= ÜST BAŞLIK VE GEZİNTİ ÇUBUĞU ======================= */}
      <header className="border-b-2 border-zinc-900 bg-white/95 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          {/* Sol: Ana Sayfa Butonu & Başlık */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentGame(null)}
              className="sketch-btn text-xs font-bold py-1.5 px-3"
            >
              ← Ana Sayfa
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍰</span>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 font-mono tracking-wider">
                  KESİR ATÖLYESİ
                </h1>
                <div className="text-[10px] text-zinc-500 font-mono -mt-0.5">
                  Fraction Workshop • 4 Etkileşimli Çalışma Alanı
                </div>
              </div>
            </div>
          </div>

          {/* Sağ: Zorluk Seçimi, Rapor ve Kurallar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono font-bold text-zinc-500">Zorluk:</span>
              {(['kolay', 'orta', 'zor'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase transition-all border ${
                    difficulty === d
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="px-2.5 py-1.5 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-50 text-xs font-bold font-mono shadow-[1px_1px_0px_#18181b] flex items-center gap-1"
              title="Öğrenme Raporu"
            >
              <span>📊</span> Rapor
            </button>

            <button
              onClick={() => setShowRulesModal(true)}
              className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-50 font-bold text-xs flex items-center justify-center shadow-[1px_1px_0px_#18181b]"
              title="Kurallar & Pedagojik Mantık"
            >
              ?
            </button>
          </div>
        </div>

        {/* 5 SEKME ÇUBUĞU (4 ETKİLEŞİMLİ ALAN + ARCADE MODU) */}
        <div className="max-w-6xl mx-auto px-4 pt-1 pb-2 flex gap-1.5 overflow-x-auto">
          {[
            { id: 'circles', icon: '🍕', title: 'Alan A: Kesir Daireleri', desc: 'Daire Dilimleri ve Parça-Bütün' },
            { id: 'bars', icon: '📏', title: 'Alan B: Kesir Çubukları', desc: 'Yatay Şeritler ve Denklik İspatı' },
            { id: 'numberline', icon: '📍', title: 'Alan C: Sayı Doğrusu', desc: 'Kesin Sayısal Konumlandırma' },
            { id: 'operations', icon: '➕', title: 'Alan D: Kesir İşlemleri', desc: 'Ortak Parçalama & Toplama/Çıkarma' },
            { id: 'pizza', icon: '👨‍🍳', title: 'Pizza Şefi Rush', desc: 'Arcade Sipariş Pratiği' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as WorkshopTab);
                playSound('click');
              }}
              className={`flex-1 min-w-[140px] p-2 rounded-xl border-2 text-left transition-all ${
                activeTab === tab.id
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-[2px_2px_0px_#18181b] scale-[1.01]'
                  : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{tab.icon}</span>
                <span className="font-mono text-xs font-black truncate">{tab.title}</span>
              </div>
              <div className={`text-[10px] truncate mt-0.5 ${activeTab === tab.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {tab.desc}
              </div>
            </button>
          ))}
        </div>
      </header>

      {/* ======================= ANA ALAN İÇERİĞİ ======================= */}
      <main className="max-w-6xl mx-auto px-4 mt-4">
        {/* ALAN A: KESİR DAİRELERİ */}
        {activeTab === 'circles' && (
          <FractionCirclesArea
            difficulty={difficulty}
            onTaskCompleted={handleAreaTaskCompleted}
          />
        )}

        {/* ALAN B: KESİR ÇUBUKLARI */}
        {activeTab === 'bars' && (
          <FractionBarsArea
            difficulty={difficulty}
            onTaskCompleted={handleAreaTaskCompleted}
          />
        )}

        {/* ALAN C: SAYI DOĞRUSU */}
        {activeTab === 'numberline' && (
          <FractionNumberLineArea
            difficulty={difficulty}
            onTaskCompleted={handleAreaTaskCompleted}
          />
        )}

        {/* ALAN D: KESİR İŞLEMLERİ */}
        {activeTab === 'operations' && (
          <FractionOperationsArea
            difficulty={difficulty}
            onTaskCompleted={handleAreaTaskCompleted}
          />
        )}

        {/* PİZZA ŞEFİ RUSH ARCADE MODU */}
        {activeTab === 'pizza' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={`text-xs px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-bold flex items-center gap-1 shadow-[1px_1px_0px_#18181b] transition-all ${
                    isZenMode ? 'bg-emerald-300 text-zinc-950' : 'bg-white text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  {isZenMode ? '🧘‍♀️ Rahat Mod' : '⏱️ Rush'}
                </button>
                {!isZenMode && (
                  <div className={`px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-mono text-xs font-black shadow-[1px_1px_0px_#18181b] ${
                    shiftTime <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-100 text-zinc-900'
                  }`}>
                    ⏱️ {shiftTime}s
                  </div>
                )}
                {combo > 1 && (
                  <div className="px-2 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 font-mono text-xs font-black shadow-[1px_1px_0px_#18181b]">
                    🔥 {combo}x
                  </div>
                )}
              </div>
              <div className="text-xs font-mono text-zinc-600 font-bold">
                🍕 Tamamlanan Sipariş: {ordersCompleted} | Puan: {score}
              </div>
            </div>

            {/* Müşteri Kartı */}
            {currentChallenge && (
              <div className="paper-card !bg-gradient-to-r !from-amber-50/60 !to-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl p-1.5 rounded-xl border-2 border-zinc-900 bg-white shadow-[2px_2px_0px_#18181b]">
                      {currentChallenge.customerAvatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase text-zinc-900 font-mono">
                          {currentChallenge.customerName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-900 bg-amber-200 font-bold text-zinc-900 font-mono">
                          {currentChallenge.orderTag}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-400 bg-white text-zinc-600 font-mono">
                          Sabır: {orderTimeLeft}s
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 font-bold mt-1">
                        "{currentChallenge.dialogue}"
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {currentChallenge.requiredIngredients.map((req, idx) => {
                          const isCompleted = traySlices.some(
                            s => s.name === req.name && fractionToString(s.fraction) === fractionToString(req.fraction)
                          );
                          return (
                            <div
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg border-2 text-[11px] font-bold font-mono flex items-center gap-1.5 ${
                                isCompleted
                                  ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
                                  : 'border-zinc-800 bg-white text-zinc-800'
                              }`}
                            >
                              <span>{req.icon}</span>
                              <span>{fractionToString(req.fraction)} {req.name}</span>
                              <span className={isCompleted ? 'text-emerald-700 font-black' : 'text-zinc-400'}>
                                {isCompleted ? '✓' : '○'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 font-mono">İstenen Toplam</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-zinc-950 flex items-center gap-2">
                      <span>{fractionToString(currentChallenge.target)}</span>
                      <MiniSlicePreview f={currentChallenge.target} color="#f59e0b" size={36} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pizzaFeedback && (
              <div className={`p-2.5 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold ${
                pizzaFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' :
                pizzaFeedback.type === 'error' ? 'bg-rose-100 text-rose-900' : 'bg-blue-100 text-blue-900'
              }`}>
                {pizzaFeedback.message}
              </div>
            )}

            {/* Pizza Tezgahı */}
            <div className="paper-card grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <PizzaTray
                  traySlices={traySlices}
                  target={target}
                  onRemoveSlice={handleRemoveSlice}
                />
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl border-2 border-zinc-900 bg-zinc-50 font-mono">
                  <div className="text-xs text-zinc-500 mb-1">Mevcut Malzemeli Dilimler:</div>
                  <div className="text-sm sm:text-base font-bold text-zinc-900">
                    {traySlices.length === 0 ? (
                      <span className="text-zinc-400 italic">Tepsi henüz boş</span>
                    ) : (
                      <span>
                        {traySlices.map(s => `${s.icon} ${fractionToString(s.fraction)}`).join(' + ')}
                        {' = '}
                        <span className={isFullyReady ? 'text-emerald-700 font-black' : isOver ? 'text-rose-700 font-black' : 'text-zinc-900 font-black'}>
                          {fractionToString(totalTrayFraction)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeliverOrder}
                    className={`flex-1 py-3 rounded-xl border-2 border-zinc-900 font-black text-xs sm:text-sm shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] transition-all ${
                      isFullyReady
                        ? 'bg-emerald-400 text-zinc-950 animate-bounce'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                    }`}
                  >
                    Siparişi Teslim Et ✓
                  </button>

                  <button
                    onClick={handleClearTray}
                    disabled={traySlices.length === 0}
                    className="px-3 py-3 rounded-xl border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 font-bold text-xs shadow-[2px_2px_0px_#18181b] disabled:opacity-40"
                  >
                    Tepsiyi Boşalt ⟲
                  </button>
                </div>
              </div>
            </div>

            {/* Tezgahtaki Malzemeler */}
            <div className="paper-card">
              <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider font-mono mb-3">
                Tezgahtaki Malzemeli Dilimler (Tıkla ve Tepsiye Ekle):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {currentChallenge?.availableSlices.map(slice => (
                  <motion.button
                    key={slice.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddSlice(slice)}
                    className="p-2.5 rounded-xl border-2 border-zinc-900 bg-white hover:bg-amber-50/50 flex flex-col items-center justify-between shadow-[2px_2px_0px_#18181b] transition-all"
                  >
                    <div className="relative">
                      <MiniSlicePreview f={slice.fraction} color={slice.color} size={38} />
                      <span className="absolute -bottom-1 -right-1 text-sm">{slice.icon}</span>
                    </div>
                    <span className="font-mono text-base font-black text-zinc-950 mt-1">
                      {fractionToString(slice.fraction)}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-800 truncate w-full text-center mt-0.5">
                      {slice.name}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 mt-1">
                      + Ekle
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================= KURALLAR VE PEDAGOJİK KILAVUZ MODALI ======================= */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-lg w-full p-6 space-y-3 font-mono text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-zinc-200">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <span>📖</span> Kesir Atölyesi Pedagojik Kılavuzu:
                </h3>
                <button onClick={() => setShowRulesModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  ✕
                </button>
              </div>

              <ul className="space-y-2 text-zinc-700">
                <li>• <strong>Bütün (Referans Alanı):</strong> Kesrin tamamını (1 tam) ifade eden standart geometrik şekiller (Daire, Çubuk) veya sayı doğrusu kesitidir.</li>
                <li>• <strong>Payda (Bölüntü Derecesi):</strong> Bütünün kaç eş parçaya ayrıldığını gösterir. Bölmeler eşit büyüklükte olmalıdır.</li>
                <li>• <strong>Pay (Etkin Parçalar):</strong> Eş parçalardan seçilen veya boyanan miktardır. İncelenen kesrin sayısal değeridir.</li>
                <li>• <strong>Denk Kesirler:</strong> Boyalı alanın toplam uzunluğu veya alanı değişmeden parça sayısının katlanmasıdır ($1/2 = 2/4$).</li>
                <li>• <strong>Ortak Payda Zorunluluğu:</strong> Farklı boyuttaki dilimler eşitlenmeden doğrudan toplanamaz veya çıkarılamaz!</li>
              </ul>

              <div className="pt-2 text-right">
                <button onClick={() => setShowRulesModal(false)} className="sketch-btn-dark px-4 py-2 font-bold text-xs">
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= ÖĞRENME RAPORU MODALI ======================= */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-md w-full p-6 space-y-4 font-mono text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b-2 border-zinc-200">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <span>📊</span> Öğrenci Kesir Gelişim Raporu:
                </h3>
                <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  ✕
                </button>
              </div>

              {/* Temel Metrikler */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                  <div className="text-zinc-500 text-[10px]">Tamamlanan Görev:</div>
                  <div className="text-base font-black text-zinc-900">{stats.tasksCompleted} Adet</div>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                  <div className="text-zinc-500 text-[10px]">Kazanılan Puan:</div>
                  <div className="text-base font-black text-emerald-700">+{stats.totalPoints} Puan</div>
                </div>
              </div>

              {/* Kavram Kazanımları */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-zinc-600 uppercase">Kazanılan Kesir Becerileri:</div>
                {[
                  { name: 'Bütün ve Parça İlişkisi', count: concepts.partWhole, desc: 'Daire üzerinde pay-payda modelleme' },
                  { name: 'Birim Kesir Mantığı', count: concepts.unitFractions, desc: '1/d parça birimi ile inşa etme' },
                  { name: 'Denk Kesirler ve Eşitlik', count: concepts.equivalence, desc: 'Çubuklarla uzunluk eşitliğini kanıtlama' },
                  { name: 'Sayı Doğrusunda Konum', count: concepts.numberLine, desc: 'Sayısal koordinat hesaplama' },
                  { name: 'Kesir İşlemleri', count: concepts.operations, desc: 'Ortak parçalama ile toplama/çıkarma' },
                ].map((c, i) => (
                  <div key={i} className="p-2 rounded-lg border border-zinc-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-900">{c.name}</div>
                      <div className="text-[10px] text-zinc-500">{c.desc}</div>
                    </div>
                    <span className="font-black text-emerald-700">✓ {c.count} Görev</span>
                  </div>
                ))}
              </div>

              <div className="text-right pt-2">
                <button onClick={() => setShowReportModal(false)} className="sketch-btn-dark px-4 py-2 font-bold text-xs">
                  Raporu Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
