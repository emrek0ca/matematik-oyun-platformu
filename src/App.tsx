import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/gameStore';

const HomePage = lazy(() => import('./pages/HomePage'));
const AlgebraGame = lazy(() => import('./pages/AlgebraGame'));
const FractionGame = lazy(() => import('./pages/FractionGame'));
const Game24 = lazy(() => import('./pages/Game24'));
const NimGame = lazy(() => import('./pages/NimGame'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-zinc-900">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-4 border-zinc-900 border-t-transparent mb-4"
      />
      <div className="font-mono text-sm font-bold text-zinc-700">Yükleniyor...</div>
    </div>
  );
}

function App() {
  const currentGame = useAppStore(s => s.currentGame);

  return (
    <div className="min-h-screen text-zinc-900">
      <Suspense fallback={<LoadingFallback />}>
        <AnimatePresence mode="wait">
          {currentGame === null && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HomePage />
            </motion.div>
          )}
          {currentGame === 'algebra' && (
            <motion.div
              key="algebra"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <AlgebraGame />
            </motion.div>
          )}
          {currentGame === 'fraction' && (
            <motion.div
              key="fraction"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <FractionGame />
            </motion.div>
          )}
          {currentGame === 'game24' && (
            <motion.div
              key="game24"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Game24 />
            </motion.div>
          )}
          {currentGame === 'nim' && (
            <motion.div
              key="nim"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <NimGame />
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

export default App;
