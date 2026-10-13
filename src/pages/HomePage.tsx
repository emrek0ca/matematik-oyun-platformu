import { motion } from 'framer-motion';
import { useAppStore, GameId } from '../store/gameStore';
import { MathBackground } from '../components/MathBackground';

interface GameCardData {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  topics: string[];
  difficulty: string;
}

const GAMES: GameCardData[] = [
  {
    id: 'algebra',
    title: 'Cebir Terazisi',
    subtitle: 'Denklemleri Dengele',
    description: 'Denge terazisi üzerinde cebirsel denklemleri çöz. Her iki tarafta eşit işlem yaparak bilinmeyeni bul!',
    icon: '⚖️',
    topics: ['Denklemler', 'Eşitlik', 'Bilinmeyenler'],
    difficulty: 'Kolay → Zor',
  },
  {
    id: 'fraction',
    title: 'Kesir Atölyesi',
    subtitle: 'Kesirleri Birleştir',
    description: 'Müşterilerin istediği kesirli pizzaları doğru dilimleri tepside birleştirerek hazırla! Süreye karşı yarış, kombo yap.',
    icon: '🍕',
    topics: ['Kesir Toplama', 'Payda Eşitleme', 'Hız & Kombo'],
    difficulty: 'Kolay → Zor',
  },
  {
    id: 'game24',
    title: '24 Oyunu',
    subtitle: 'Dört İşlemle 24\'e Ulaş',
    description: 'Verilen 4 sayıyı +, -, ×, ÷ işlemleriyle birleştirerek tam olarak 24 sonucuna ulaş!',
    icon: '🃏',
    topics: ['Aritmetik', 'Strateji', 'İşlem Önceliği'],
    difficulty: 'Orta → Zor',
  },
  {
    id: 'nim',
    title: 'NIM',
    subtitle: 'Strateji Oyunu',
    description: 'Nesneleri yığınlardan stratejik olarak al ve son nesneyi alan sen ol! XOR ikili sistem stratejisini keşfet.',
    icon: '🏛️',
    topics: ['İkili Sistem', 'XOR', 'Strateji'],
    difficulty: 'Kolay → Zor',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function HomePage() {
  const { setCurrentGame, progress, playSound } = useAppStore();
  
  function handleGameSelect(gameId: GameId) {
    playSound('click');
    setCurrentGame(gameId);
  }
  
  function getGameStats(id: GameId) {
    return progress[id];
  }

  return (
    <div className="min-h-screen relative">
      <MathBackground />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-block max-w-3xl mx-auto px-6 py-4 rounded-2xl bg-white/70 backdrop-blur-[2px] border border-zinc-200/80 shadow-[2px_2px_0px_#18181b]"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-zinc-950 mb-2 tracking-tight">
            Matematik Oyun Platformu
          </h1>
          <p className="text-zinc-700 text-base sm:text-lg max-w-2xl mx-auto font-medium">
            Matematik eğitimi için tasarlanmış dört etkileşimli çalışma modülü. 
            Doğrudan matematiksel kavramları deneyerek ve çizerek keşfet.
          </p>
        </motion.div>
      </section>

      {/* 4 Games Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {GAMES.map((game) => {
            const stats = getGameStats(game.id);
            const winRate = stats.gamesPlayed > 0 
              ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
              : null;
            
            return (
              <motion.div
                key={game.id}
                variants={cardVariants}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGameSelect(game.id)}
                className="paper-card cursor-pointer flex flex-col justify-between group !bg-[linear-gradient(145deg,#ffffff_0%,#f4f9ff_50%,#e3f1fc_100%)] hover:!bg-[linear-gradient(145deg,#ffffff_0%,#edf6ff_45%,#d8ecfc_100%)] transition-all"
              >
                <div>
                  {/* Icon & Difficulty Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl p-2 rounded-xl border-2 border-zinc-900 bg-zinc-50 inline-block shadow-[2px_2px_0px_#18181b]">
                      {game.icon}
                    </span>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded border border-zinc-900 bg-zinc-100 text-zinc-800">
                      {game.difficulty}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-xl font-black text-zinc-900 mb-1 group-hover:underline">
                    {game.title}
                  </h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {game.subtitle}
                  </p>
                  
                  {/* Description */}
                  <p className="text-xs text-zinc-700 leading-relaxed mb-4">
                    {game.description}
                  </p>
                  
                  {/* Topics */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {game.topics.map(topic => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold border border-zinc-300 bg-zinc-50 text-zinc-800"
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Stats & Play Action */}
                <div className="pt-3 border-t-2 border-zinc-200 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {stats.gamesPlayed > 0 
                      ? `${stats.gamesPlayed} oyun · %${winRate}`
                      : 'Yeni Başla'
                    }
                  </span>
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Oyna →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
