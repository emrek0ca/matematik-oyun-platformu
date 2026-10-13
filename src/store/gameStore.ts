/**
 * Global oyun durumu - Zustand store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameId = 'algebra' | 'fraction' | 'game24' | 'nim';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestScore: number;
  totalTimeSeconds: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayed?: string;
}

export interface PlayerProgress {
  algebra: GameStats;
  fraction: GameStats;
  game24: GameStats;
  nim: GameStats;
  totalPoints: number;
  level: number;
}

const defaultStats: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  bestScore: 0,
  totalTimeSeconds: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const defaultProgress: PlayerProgress = {
  algebra: { ...defaultStats },
  fraction: { ...defaultStats },
  game24: { ...defaultStats },
  nim: { ...defaultStats },
  totalPoints: 0,
  level: 1,
};

export type SoundEffect = 'correct' | 'wrong' | 'win' | 'lose' | 'click' | 'move' | 'hint';

interface AppState {
  // Navigation
  currentGame: GameId | null;
  
  // Settings
  soundEnabled: boolean;
  animationsEnabled: boolean;
  
  // Progress
  progress: PlayerProgress;
  
  // Actions
  setCurrentGame: (game: GameId | null) => void;
  toggleSound: () => void;
  toggleAnimations: () => void;
  recordGameResult: (game: GameId, won: boolean, score: number, timeSeconds: number) => void;
  resetProgress: () => void;
  playSound: (effect: SoundEffect) => void;
}

// Ses efektleri (Web Audio API)
class SoundManager {
  private context: AudioContext | null = null;
  
  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }
  
  play(effect: SoundEffect, enabled: boolean): void {
    if (!enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      switch (effect) {
        case 'correct':
          oscillator.frequency.setValueAtTime(523, now);     // C5
          oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
          oscillator.frequency.setValueAtTime(784, now + 0.2); // G5
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;
          
        case 'wrong':
          oscillator.frequency.setValueAtTime(200, now);
          oscillator.frequency.setValueAtTime(150, now + 0.2);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          oscillator.start(now);
          oscillator.stop(now + 0.4);
          break;
          
        case 'win':
          oscillator.frequency.setValueAtTime(523, now);
          oscillator.frequency.setValueAtTime(659, now + 0.15);
          oscillator.frequency.setValueAtTime(784, now + 0.3);
          oscillator.frequency.setValueAtTime(1047, now + 0.45);
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          oscillator.start(now);
          oscillator.stop(now + 0.8);
          break;
          
        case 'lose':
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.setValueAtTime(300, now + 0.2);
          oscillator.frequency.setValueAtTime(200, now + 0.4);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          oscillator.start(now);
          oscillator.stop(now + 0.6);
          break;
          
        case 'click':
          oscillator.frequency.setValueAtTime(800, now);
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          oscillator.start(now);
          oscillator.stop(now + 0.05);
          break;
          
        case 'move':
          oscillator.frequency.setValueAtTime(440, now);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          break;
          
        case 'hint':
          oscillator.frequency.setValueAtTime(600, now);
          oscillator.frequency.setValueAtTime(700, now + 0.1);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;
      }
    } catch (e) {
      // Ses desteği yoksa sessiz geç
    }
  }
}

const soundManager = new SoundManager();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentGame: null,
      soundEnabled: true,
      animationsEnabled: true,
      progress: { ...defaultProgress },
      
      setCurrentGame: (game) => set({ currentGame: game }),
      
      toggleSound: () => set(s => ({ soundEnabled: !s.soundEnabled })),
      
      toggleAnimations: () => set(s => ({ animationsEnabled: !s.animationsEnabled })),
      
      recordGameResult: (game, won, score, timeSeconds) => {
        set(s => {
          const stats = { ...s.progress[game] };
          stats.gamesPlayed++;
          if (won) stats.gamesWon++;
          stats.totalScore += score;
          if (score > stats.bestScore) stats.bestScore = score;
          stats.totalTimeSeconds += timeSeconds;
          stats.currentStreak = won ? stats.currentStreak + 1 : 0;
          if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
          stats.lastPlayed = new Date().toISOString();
          
          const newTotalPoints = s.progress.totalPoints + score;
          const newLevel = Math.floor(newTotalPoints / 500) + 1;
          
          return {
            progress: {
              ...s.progress,
              [game]: stats,
              totalPoints: newTotalPoints,
              level: newLevel,
            },
          };
        });
      },
      
      resetProgress: () => set({ progress: { ...defaultProgress } }),
      
      playSound: (effect) => soundManager.play(effect, get().soundEnabled),
    }),
    {
      name: 'matematik-oyun-platformu',
      version: 1,
    }
  )
);
