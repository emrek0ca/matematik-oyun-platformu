import { useState, useEffect, useCallback, useRef } from 'react';
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

type Difficulty = 'kolay' | 'orta' | 'zor';

// Dairesel Pizza Tepsisi Çizici
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

  // Tepsideki dilimlerin açılarını birikimli hesapla
  let currentAngle = -Math.PI / 2;
  const renderedSlices = traySlices.map((s, idx) => {
    const sliceAngle = (toDecimal(s.fraction) * 2 * Math.PI);
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
          {/* Tepsi Dış Kenarı (Karakalem Eskiz Kenarlık) */}
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
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="#ffffff"
            stroke="#e4e4e7"
            strokeWidth="1.5"
          />

          {/* Dilimler */}
          {renderedSlices.map((s) => (
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

        {/* Tepsideki Durum Rozeti */}
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
  const [difficulty, setDifficulty] = useState<Difficulty>('kolay');
  const [currentChallenge, setCurrentChallenge] = useState<PizzaOrderChallenge | null>(null);
  const [traySlices, setTraySlices] = useState<PizzaSliceOption[]>([]);
  
  // Rush Arcade / Rahat Mod Durumu
  const [isZenMode, setIsZenMode] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const [score, setScore] = useState(0);
  const [shiftTime, setShiftTime] = useState(60);
  const [orderTimeLeft, setOrderTimeLeft] = useState(40);
  const [combo, setCombo] = useState(1);
  const [ordersCompleted, setOrdersCompleted] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Yeni Sipariş Oluştur
  const nextOrder = useCallback(() => {
    const ch = generatePizzaChallenge(difficulty);
    setCurrentChallenge(ch);
    setTraySlices([]);
    setOrderTimeLeft(ch.timeLimit);
    setHintActive(false);
  }, [difficulty]);

  // Yeni Vardiyaya Başla (Oyunu Sıfırla)
  const startNewShift = useCallback(() => {
    setScore(0);
    setShiftTime(60);
    setCombo(1);
    setOrdersCompleted(0);
    setIsGameOver(false);
    setFeedback(null);
    setHintActive(false);
    nextOrder();
  }, [nextOrder]);

  useEffect(() => {
    startNewShift();
  }, [startNewShift]);

  // Sayaç ve Zaman Döngüsü (Rahat modda süre akmaz)
  useEffect(() => {
    if (isGameOver || isZenMode) {
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
          // Müşteri sabrı bitti, sıradaki müşteri gelir
          playSound('click');
          setCombo(1);
          setFeedback({ message: 'Müşteri beklemekten sıkılıp gitti! Yeni müşteri geldi.', type: 'info' });
          nextOrder();
          return 30;
        }
        return ot - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver, isZenMode, nextOrder, playSound]);

  // İpucu Butonu
  function handleToggleHint() {
    playSound('hint');
    setHintActive(true);
    if (currentChallenge) {
      setFeedback({ message: currentChallenge.hint, type: 'info' });
    }
  }

  // Dilim Ekleme
  function handleAddSlice(slice: PizzaSliceOption) {
    if (isGameOver) return;
    playSound('click');
    setTraySlices(prev => [...prev, slice]);
  }

  // Tepsiden Dilim Çıkarma
  function handleRemoveSlice(index: number) {
    playSound('click');
    setTraySlices(prev => prev.filter((_, i) => i !== index));
  }

  // Tepsiyi Tamamen Sıfırla
  function handleClearTray() {
    playSound('click');
    setTraySlices([]);
  }

  // Tepsideki toplam kesri hesapla
  let totalTrayFraction = fraction(0, 1);
  traySlices.forEach(s => {
    totalTrayFraction = add(totalTrayFraction, s.fraction);
  });

  const target = currentChallenge ? currentChallenge.target : fraction(1, 1);
  const comparison = compare(totalTrayFraction, target);
  const isMatch = comparison === 0;
  const isOver = comparison === 1;

  // Malzeme kontrolü: Müşterinin istediği her malzeme ve kesir tepside var mı?
  const missingIngredient = currentChallenge?.requiredIngredients?.find(req => {
    return !traySlices.some(
      s => s.name === req.name && fractionToString(s.fraction) === fractionToString(req.fraction)
    );
  });
  const allIngredientsMatch = !missingIngredient;
  const isFullyReady = isMatch && allIngredientsMatch;

  // Siparişi Teslim Et
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
      
      setFeedback({
        message: `Nefis! ${currentChallenge.customerName} bayıldı! Malzemeler tam istendiği gibiydi! +${earned} Puan (+${bonusSeconds}s bonus)`,
        type: 'success',
      });
      recordGameResult('fraction', true, earned, 15);
      nextOrder();
    } else {
      playSound('wrong');
      if (isOver) {
        setFeedback({ message: 'Pizza çok büyük oldu! Fazla dilimleri tepsiden çıkar.', type: 'error' });
      } else if (!isMatch) {
        const diff = subtract(target, totalTrayFraction);
        setFeedback({ message: `Eksik var! Hedefe ulaşmak için ${fractionToString(diff)} daha eklemelisin.`, type: 'error' });
      } else if (!allIngredientsMatch && missingIngredient) {
        setFeedback({
          message: `Kesir toplamı doğru ama malzeme eksik/yanlış! Müşteri ${missingIngredient.icon} ${missingIngredient.name} (${fractionToString(missingIngredient.fraction)}) istemişti.`,
          type: 'error',
        });
      }
    }
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Üst Bar */}
      <header className="border-b-2 border-zinc-900 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setCurrentGame(null)} className="sketch-btn text-xs font-bold">
            ← Ana Sayfa
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🍕</span>
            <h1 className="text-base font-extrabold text-zinc-900 font-mono tracking-wider">KESİR ATÖLYESİ</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Süresiz / Rush Modu Butonu */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className={`text-xs px-2.5 py-1 rounded border-2 border-zinc-900 font-bold flex items-center gap-1 shadow-[1px_1px_0px_#18181b] transition-all ${
                isZenMode ? 'bg-emerald-300 text-zinc-950' : 'bg-white text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              {isZenMode ? '🧘‍♀️ Rahat Mod' : '⏱️ Rush'}
            </button>

            {/* Süre (Sadece Rush modunda) */}
            {!isZenMode && (
              <div className={`px-2.5 py-1 rounded border-2 border-zinc-900 font-mono text-xs font-black shadow-[1px_1px_0px_#18181b] ${
                shiftTime <= 10 ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-100 text-zinc-900'
              }`}>
                ⏱️ {shiftTime}s
              </div>
            )}

            {/* Kombo */}
            {combo > 1 && (
              <div className="px-2 py-1 rounded border-2 border-zinc-900 bg-amber-400 text-zinc-950 font-mono text-xs font-black shadow-[1px_1px_0px_#18181b]">
                🔥 {combo}x
              </div>
            )}

            {/* Skor */}
            <span className="text-xs font-bold font-mono px-2 py-1 rounded border border-zinc-900 bg-zinc-100">
              {score} P
            </span>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-white font-bold text-xs flex items-center justify-center shadow-[1px_1px_0px_#18181b]"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      {/* Yardım Kutusu */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 p-4 rounded-xl max-w-4xl mx-auto border-2 border-zinc-900 bg-white shadow-[3px_3px_0px_#18181b]"
          >
            <h3 className="font-bold text-zinc-900 mb-1 text-sm">🎨 Kesir Atölyesi Kuralları:</h3>
            <ul className="text-xs text-zinc-700 space-y-1">
              <li>• Müşteriler belirli bir kesir kadar pizza ister (Örn: <strong>3/4</strong> veya <strong>5/8</strong> pizza).</li>
              <li>• Tezgahtaki dilimleri (1/2, 1/4, 1/8...) tepsiye tıklayarak ekle ve hedef kesre tam olarak ulaş!</li>
              <li>• Fazla koyarsan dilimin üzerine tıklayarak tepsiden çıkarabilirsin.</li>
              <li>• Her doğru sipariş <strong>+50 puan</strong> ve <strong>+6 saniye ek süre</strong> kazandırır. Peş peşe teslimatlarda kombo çarpanı artar!</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 mt-4 space-y-4">
        {/* Zorluk & Ayar Çubuğu */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['kolay', 'orta', 'zor'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); }}
                className={`text-xs px-3 py-1 rounded-lg border-2 border-zinc-900 font-bold capitalize transition-all ${
                  difficulty === d
                    ? 'bg-zinc-900 text-white shadow-[1px_1px_0px_#18181b]'
                    : 'bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-zinc-600 font-bold">
            🍕 Tamamlanan Sipariş: {ordersCompleted}
          </div>
        </div>

        {/* Aktif Müşteri ve Sipariş Kartı */}
        {currentChallenge && (
          <div className="paper-card !bg-gradient-to-r !from-amber-50/60 !to-white p-4">
            <div className="flex items-center justify-between">
              {/* Müşteri Profili */}
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

                  {/* İstenen Malzemeli Dilimler Kontrol Listesi */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentChallenge.requiredIngredients.map((req, idx) => {
                      const isCompleted = traySlices.some(
                        s => s.name === req.name && fractionToString(s.fraction) === fractionToString(req.fraction)
                      );
                      return (
                        <div
                          key={idx}
                          className={`px-2 py-0.5 rounded-lg border-2 text-[11px] font-bold font-mono flex items-center gap-1.5 transition-all ${
                            isCompleted
                              ? 'border-emerald-700 bg-emerald-100 text-emerald-950 shadow-[1px_1px_0px_#047857]'
                              : 'border-zinc-800 bg-white text-zinc-800 shadow-[1px_1px_0px_#18181b]'
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

              {/* Hedef Kesir Rozeti */}
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-zinc-500 font-mono">İstenen Toplam</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-zinc-950 flex items-center gap-2">
                  <span>{fractionToString(currentChallenge.target)}</span>
                  <MiniSlicePreview f={currentChallenge.target} color="#f59e0b" size={36} />
                </div>
              </div>
            </div>

            {/* Müşteri Sabır Çubuğu */}
            <div className="w-full h-1.5 bg-zinc-200 rounded-full mt-3 overflow-hidden border border-zinc-300">
              <div
                className="h-full transition-all duration-1000 bg-amber-500"
                style={{ width: `${(orderTimeLeft / currentChallenge.timeLimit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Geri Bildirim Bildirimi */}
        {feedback && (
          <div className={`p-2.5 rounded-lg border-2 border-zinc-900 font-mono text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' :
            feedback.type === 'error' ? 'bg-rose-100 text-rose-900' : 'bg-blue-100 text-blue-900'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Pişirme Tezgahı (Merkez Ekran) */}
        <div className="paper-card grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Sol Kolon: İnteraktif Pizza Tepsisi */}
          <div>
            <PizzaTray
              traySlices={traySlices}
              target={target}
              onRemoveSlice={handleRemoveSlice}
            />
          </div>

          {/* Sağ Kolon: Canlı Matematiksel Durum ve Eylemler */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 font-mono">
                Tepsi Malzeme & Matematik Durumu
              </h3>

              {/* Matematiksel Denklem */}
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

                <div className="text-xs text-zinc-600 mt-2 flex items-center justify-between border-t border-zinc-200 pt-1.5 flex-wrap gap-1">
                  <span>Hedef: <strong>{fractionToString(target)}</strong></span>
                  <span>
                    {isFullyReady && <span className="text-emerald-600 font-bold">✓ Malzemeler ve Ölçü Tam!</span>}
                    {isOver && <span className="text-rose-600 font-bold">⚠️ Hedefi Aştı</span>}
                    {!isFullyReady && !isOver && traySlices.length > 0 && isMatch && (
                      <span className="text-rose-600 font-bold">⚠️ Malzeme çeşidi eksik/yanlış</span>
                    )}
                    {!isFullyReady && !isOver && traySlices.length > 0 && !isMatch && (
                      <span className="text-amber-600 font-bold">⏳ {fractionToString(subtract(target, totalTrayFraction))} eksik</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Butonlar */}
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
                onClick={handleToggleHint}
                className="px-3 py-3 rounded-xl border-2 border-zinc-900 bg-amber-300 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-[2px_2px_0px_#18181b] flex items-center gap-1 active:scale-95 transition-all"
                title="Şef İpucu Al"
              >
                💡 İpucu
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

        {/* Tezgahtaki Malzemeler / Dilim Seçenekleri */}
        <div className="paper-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider font-mono">
              Tezgahtaki Malzemeli Dilimler (Tıkla ve Tepsiye Ekle)
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              Tepside: {traySlices.length} dilim
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {currentChallenge?.availableSlices.map((slice) => {
              const isHinted = hintActive && slice.isSolution;
              return (
                <motion.button
                  key={slice.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddSlice(slice)}
                  className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-between shadow-[2px_2px_0px_#18181b] transition-all ${
                    isHinted
                      ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-400 animate-pulse'
                      : 'border-zinc-900 bg-white hover:bg-amber-50/50'
                  }`}
                >
                  {isHinted && (
                    <span className="text-[9px] font-black uppercase px-1 rounded bg-amber-400 text-zinc-900 mb-0.5">
                      💡 İPUCU!
                    </span>
                  )}
                  <div className="relative">
                    <MiniSlicePreview f={slice.fraction} color={slice.color} size={38} />
                    <span className="absolute -bottom-1 -right-1 text-sm">{slice.icon}</span>
                  </div>
                  <span className="font-mono text-base font-black text-zinc-950 mt-1">
                    {fractionToString(slice.fraction)}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-800 truncate w-full text-center mt-0.5 flex items-center justify-center gap-1">
                    <span>{slice.icon}</span>
                    <span className="truncate">{slice.name}</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 mt-1">
                    + Ekle
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Vardiya Bitti / Oyun Sonu Modalı */}
      <AnimatePresence>
        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="paper-card max-w-sm w-full text-center space-y-4 p-6"
            >
              <div className="text-5xl">👨‍🍳🎉</div>
              <h2 className="text-xl font-black text-zinc-950 font-mono">
                VARDİYA TAMAMLANDI!
              </h2>
              <p className="text-xs text-zinc-600">
                Pizzacı dükkanında harika bir kesir mesaisi yaptın! İşte gün sonu raporun:
              </p>

              <div className="p-3 rounded-xl border-2 border-zinc-900 bg-zinc-50 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Teslim Edilen Pizza:</span>
                  <span className="font-black text-zinc-900">{ordersCompleted} adet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Toplam Puan:</span>
                  <span className="font-black text-emerald-700">{score} Puan</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startNewShift}
                  className="sketch-btn-dark flex-1 py-2.5 font-bold text-xs"
                >
                  Yeni Vardiyaya Başla ⟲
                </button>
                <button
                  onClick={() => setCurrentGame(null)}
                  className="sketch-btn py-2.5 px-4 font-bold text-xs"
                >
                  Ana Sayfa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
