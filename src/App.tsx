/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  Megaphone,
  VolumeX,
  Music,
  Play,
  Pause,
  RotateCcw,
  Award,
  Heart,
  Star,
  Sparkles,
  Info,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { GameScreen, FloatingItem, LevelConfig, BalloonColor, GameScoreState } from './types';
import { LEVELS, COLOR_LIST, getBalloonColorById } from './utils/levels';
import { audioEngine } from './utils/audio';
import GuardianCharacter from './components/GuardianCharacter';
import FloatingElement from './components/FloatingElement';

export default function App() {
  // Screens & Navigation
  const [screen, setScreen] = useState<GameScreen>('start');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const currentConfig = LEVELS[currentLevelIdx];

  // Game states
  const [scoreState, setScoreState] = useState<GameScoreState>({
    points: 0,
    correctCount: 0,
    errorCount: 0,
    consecutiveCorrect: 0,
    lives: 3
  });

  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
  const [activeTargetColorId, setActiveTargetColorId] = useState<string>('red');
  const activeTargetColorIdRef = useRef<string>('red');

  const updateActiveTargetColorId = (colorId: string) => {
    setActiveTargetColorId(colorId);
    activeTargetColorIdRef.current = colorId;
  };

  const [timeRemaining, setTimeRemaining] = useState<number>(45);
  const [guardianExpression, setGuardianExpression] = useState<'idle' | 'happy' | 'sad' | 'celebrate'>('idle');
  const [targetFlashActive, setTargetFlashActive] = useState<boolean>(false);
  const [showEncouragePopup, setShowEncouragePopup] = useState<string | null>(null);
  
  // Settings
  const [isSfxOn, setIsSfxOn] = useState<boolean>(true);
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(true);

  // Pause / Resume Control State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Level intro overlay state
  const [isLevelIntroActive, setIsLevelIntroActive] = useState<boolean>(true);

  const togglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;
    if (nextPaused) {
      audioEngine.speakArabic("تَمَّ إِيقَافُ اللَّعِبِ مُؤَقَّتًا يَا بَطَلْ!");
    } else {
      audioEngine.speakArabic("تَمَّ اسْتِئْنَافُ اللَّعِبِ، رَكِّزْ جَيِّدًا يَا بَطَلْ!");
    }
  };

  // Success sparkle triggers
  const [sparklePoints, setSparklePoints] = useState<{ id: number; x: number; y: number }[]>([]);

  // Refs for loops
  const requestRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<any>(null);
  const levelTimerRef = useRef<any>(null);
  const targetRotationTimerRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);

  // Sync SFX state and ensure background music is always disabled
  useEffect(() => {
    audioEngine.toggleSfx(isSfxOn);
    audioEngine.toggleMusic(false);
    audioEngine.stopMusic();
  }, [isSfxOn]);

  // Clean up loops when unmounting or changing screen
  useEffect(() => {
    if (screen !== 'playing') {
      stopGameLoops();
    }
    return () => stopGameLoops();
  }, [screen]);

  // Level setup on screen 'playing' - Show level instructions first
  useEffect(() => {
    if (screen === 'playing') {
      prepareLevelIntro();
    }
  }, [screen, currentLevelIdx]);

  // Check if target correct count has been reached to complete the level
  useEffect(() => {
    if (screen === 'playing') {
      const targetCount = currentConfig.targetCount;
      if (scoreState.correctCount >= targetCount) {
        const timer = setTimeout(() => {
          handleLevelCompleted();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [scoreState.correctCount, screen, currentConfig.targetCount]);

  const stopGameLoops = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    if (targetRotationTimerRef.current) clearInterval(targetRotationTimerRef.current);
  };

  const prepareLevelIntro = () => {
    stopGameLoops();
    setIsPaused(false);
    isPausedRef.current = false;
    setIsLevelIntroActive(true);
    
    // Reset statistics for level
    setScoreState({
      points: scoreState.points, // accumulate points over levels
      correctCount: 0,
      errorCount: 0,
      consecutiveCorrect: 0,
      lives: 3
    });

    setFloatingItems([]);
    setGuardianExpression('idle');
    setShowEncouragePopup(null);

    // Level-specific configurations
    const initialTarget = currentConfig.targetColors[0] || 'red';
    updateActiveTargetColorId(initialTarget);

    // Play Voice guidance intro to let the child understand the task distraction-free
    if (isVoiceOn) {
      audioEngine.speakArabic(currentConfig.voicePrompt);
    }
  };

  const startLevelGameplay = () => {
    setIsLevelIntroActive(false);

    // Play excitement start audio and a short word of motivation
    audioEngine.playPop();
    if (isVoiceOn) {
      audioEngine.speakArabic("اِنْطَلِقْ يَا بَطَلْ!");
    }

    // Levels 3 & 5: Rotate active target color
    if (currentConfig.id === 3 || currentConfig.id === 5) {
      setupTargetColorSwitcher();
    }

    // Level 5: Setup countdown timer
    if (currentConfig.timeLimitSeconds) {
      setTimeRemaining(currentConfig.timeLimitSeconds);
      levelTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (isPausedRef.current) return prev;
          if (prev <= 1) {
            clearInterval(levelTimerRef.current);
            // Verify if goal was reached
            handleLevelLost();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Spawn loops
    spawnTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      spawnNewItem();
    }, currentConfig.spawnRateMs);

    // Frame updates loop for movement
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(updateItemsLoop);
  };

  // Switch target colors dynamically for Level 3 and Level 5
  const setupTargetColorSwitcher = () => {
    targetRotationTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      // Choose an alternative Color that is a valid possible color
      // Level 3 can switch between red, yellow, green, blue
      // Level 5 switches among all 6 colors
      const range = currentConfig.id === 3 ? ['red', 'yellow', 'green', 'blue'] : COLOR_LIST.map((c) => c.id);
      let nextIndex = Math.floor(Math.random() * range.length);
      while (range[nextIndex] === activeTargetColorIdRef.current) {
        nextIndex = Math.floor(Math.random() * range.length);
      }
      const nextColorId = range[nextIndex];
      
      updateActiveTargetColorId(nextColorId);
      setTargetFlashActive(true);
      setTimeout(() => setTargetFlashActive(false), 1200);

      // Play alert chime and spoken warning
      const targetColorObj = getBalloonColorById(nextColorId);
      if (isVoiceOn) {
        audioEngine.speakArabic(`انْتَبِهْ يَا بَطَلْ! فَرْقِعْ بَالُونَاتِ اللَّوْنِ ${targetColorObj.nameAr} الْآنَ!`);
      }
    }, 6000); // changes every 6 seconds to train cognitive flexibility
  };

  // Item generation
  const spawnNewItem = () => {
    // Weigh chance to spawn a target item higher so the game remains dynamic and exciting
    const rand = Math.random();
    let type: 'balloon' | 'butterfly' | 'star' | 'gift' | 'cloud' = 'balloon';
    let colorId = '';
    let colorHex = '';

    // Level 4 and 5 can spawn distracting insects/items
    if (currentConfig.allowDistractions && rand < 0.35) {
      // Spawn standard distractor
      const distIndex = Math.floor(Math.random() * currentConfig.distractors.length);
      type = currentConfig.distractors[distIndex];
    } else {
      type = 'balloon';
      // Pick random color from COLOR_LIST
      // If rand > 0.6, force spawning of a current target color to ensure kids don't feel bored
      if (rand > 0.5) {
        colorId = currentConfig.id === 3 || currentConfig.id === 5 ? activeTargetColorIdRef.current : currentConfig.targetColors[Math.floor(Math.random() * currentConfig.targetColors.length)];
      } else {
        colorId = COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)].id;
      }
      colorHex = getBalloonColorById(colorId).hex;
    }

    const newItem: FloatingItem = {
      id: Math.random().toString(),
      type,
      colorId,
      colorHex,
      x: 12 + Math.random() * 76, // keep safe horizontal clearance
      y: 110, // starts offscreen below
      speed: (0.7 + Math.random() * 0.9) * currentConfig.speedMultiplier,
      size: 65 + Math.random() * 20, // friendly size for kid clicks,
      isPopped: false,
      scoreAwarded: false,
      shapeIndex: Math.floor(Math.random() * 100),
      angle: Math.random() * Math.PI,
      angleSpeed: 0.01 + Math.random() * 0.02
    };

    setFloatingItems((prev) => [...prev, newItem]);
  };

  // Motion physics loop
  const updateItemsLoop = (timestamp: number) => {
    if (!isPausedRef.current) {
      setFloatingItems((prevItems) => {
        const updated: FloatingItem[] = [];

        for (const item of prevItems) {
          if (item.isPopped) {
            updated.push(item);
            continue; // keep on screen during burst animation
          }

          // Rise upwards
          const nextY = item.y - item.speed;

          // If balloon or item escapes the screen limit, just remove it gracefully from the list
          if (nextY < -15) {
            continue; // remove from list gracefully (no hearts or points deducted)
          }

          updated.push({
            ...item,
            y: nextY,
            angle: item.angle + item.angleSpeed
          });
        }

        return updated;
      });
    }

    requestRef.current = requestAnimationFrame(updateItemsLoop);
  };

  // Click handler on Floating Element
  const handleItemPopped = (itemId: string, isCorrect: boolean) => {
    if (isPausedRef.current) return;
    setFloatingItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) return { ...item, isPopped: true };
        return item;
      })
    );

    if (isCorrect) {
      // 1. Success Pop
      audioEngine.playPop();
      audioEngine.playCorrect();

      // Spawn visual sparkle coordinate
      const poppedItem = floatingItems.find((item) => item.id === itemId);
      if (poppedItem) {
        const sprId = Date.now() + Math.random();
        setSparklePoints((prev) => [...prev, { id: sprId, x: poppedItem.x, y: poppedItem.y }]);
        setTimeout(() => {
          setSparklePoints((prev) => prev.filter((p) => p.id !== sprId));
        }, 1200);
      }

      setScoreState((prev) => {
        const nextPoints = prev.points + 10;
        const nextCorrect = prev.correctCount + 1;
        const nextConsecutive = prev.consecutiveCorrect + 1;

        // Custom Encourages every 3 consecutive wins
        if (nextConsecutive > 0 && nextConsecutive % 3 === 0) {
          triggerSuccessMilestone(nextConsecutive);
        } else {
          setGuardianExpression('happy');
          setTimeout(() => setGuardianExpression('idle'), 1200);
        }

        return {
          ...prev,
          points: nextPoints,
          correctCount: nextCorrect,
          consecutiveCorrect: nextConsecutive
        };
      });
    } else {
      // 2. Erroneous Pop (wrong color balloon or clicked a distractor!)
      audioEngine.playIncorrect();

      // Deduct heart and points
      setScoreState((prev) => {
        const nextPoints = Math.max(0, prev.points - 5);
        const nextErr = prev.errorCount + 1;
        const nextLives = prev.lives - 1;

        if (nextLives <= 0) {
          setTimeout(() => handleLevelLost(), 500);
        }

        return {
          ...prev,
          points: nextPoints,
          errorCount: nextErr,
          consecutiveCorrect: 0,
          lives: Math.max(0, nextLives)
        };
      });

      setGuardianExpression('sad');
      setTimeout(() => setGuardianExpression('idle'), 1500);

      // Encourage child with sweet, non-hurtful phrases
      const alerts = [
        'لَا بَأْسَ، حَاوِلْ مُجَدَّدًا يَا بَطَلْ!',
        'انْتَبِهْ جَيِّدًا لِلْأَلْوَانِ الْمَطْلُوبَةِ!',
        'رَكِّزْ قَلِيلًا، أَنْتَ تَسْتَطِيعُ فِعْلَ ذَلِكَ!',
        'تَجَنَّبْ لَمْسَ الْمُشَتِّتَاتِ الطَّائِرَةِ!'
      ];
      const selectedMessage = alerts[Math.floor(Math.random() * alerts.length)];
      setShowEncouragePopup(selectedMessage);
      if (isVoiceOn) {
        audioEngine.speakArabic(selectedMessage);
      }
      setTimeout(() => setShowEncouragePopup(null), 2500);
    }
  };

  // Clean-up animation sparkles when a core milestone reached
  const triggerSuccessMilestone = (count: number) => {
    setGuardianExpression('celebrate');
    setTimeout(() => setGuardianExpression('idle'), 2000);

    const rewardsAr = [
      'مُمْتَازٌ! أَنْتَ حَارِسٌ مُدْهِشٌ يَا بَطَلْ!',
      'أَحْسَنْتَ يَا بَطَلْ! وَاصِلِ التَّرْكِيزَ!',
      'رَائِعٌ جِدًّا يَا بَطَلْ! اسْتَمِرَّ هَكَذَا!',
      'ذَكَاءٌ خَارِقٌ وَتَرْكِيزٌ رَائِعٌ!'
    ];
    const rewardMsg = rewardsAr[Math.floor(Math.random() * rewardsAr.length)];
    setShowEncouragePopup(rewardMsg);
    if (isVoiceOn) {
      audioEngine.speakArabic(rewardMsg);
    }
    setTimeout(() => setShowEncouragePopup(null), 2500);
  };

  const handleLevelCompleted = () => {
    stopGameLoops();
    audioEngine.playLevelComplete();
    setScreen('level_complete');
    
    if (isVoiceOn) {
      audioEngine.speakArabic('رَائِعٌ يَا بَطَلْ! لَقَدْ أَنْجَزْتَ الْمُهِمَّةَ بِنَجَاح، أَنْتَ مُسْتَعِدٌّ لِلتَّحَدِّي التَّالِي!');
    }
  };

  const handleLevelLost = () => {
    stopGameLoops();
    setScreen('game_over');
    if (isVoiceOn) {
      audioEngine.speakArabic('لَا بَأْسَ يَا صَدِيقِي، الْخَطَأُ هُوَ بِدَايَةُ التَّعَلُّم. دَعْنَا نُحَاوِلُ مُجَدَّدًا بِحَمَاسٍ أَكْبَرَ!');
    }
  };

  const navigateNextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx((prev) => prev + 1);
      setScreen('playing');
    } else {
      // Game completely finished and won!
      setScreen('completed');
      audioEngine.playGameComplete();
      if (isVoiceOn) {
        audioEngine.speakArabic('يَا لِلْهَوْلِ! لَقَدْ أَنْقَذْتَ مَمْلَكَةَ الْأَلْوَانِ بِالْكَامِلِ وَحَصَلْتَ عَلَى وِسَامِ الْحَارِسِ الْأَعْظَمْ! أَنْتَ رَائِعٌ وَمُبْدِعٌ يَا بَطَلْ!');
      }
    }
  };

  // Retry level
  const retryLevel = () => {
    setScreen('playing');
  };

  // Restart entire game
  const resetEntireGame = () => {
    setCurrentLevelIdx(0);
    setScoreState({
      points: 0,
      correctCount: 0,
      errorCount: 0,
      consecutiveCorrect: 0,
      lives: 3
    });
    setScreen('playing');
  };

  return (
    <div
      dir="rtl"
      className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-sky-100 font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        {/* Sky gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-100 to-lime-50" />

        {/* Smiling Sun with Eyes */}
        <div className="absolute top-10 left-[8%] md:left-[15%] w-24 h-24 bg-amber-400 rounded-full flex items-center justify-center animate-spin-slow shadow-lg shadow-amber-300/30">
          <div className="relative w-20 h-20 bg-amber-300 rounded-full flex items-center justify-center">
            {/* Cute eyes & cheeks */}
            <div className="absolute top-7 left-4 w-2 h-2 bg-neutral-700 rounded-full" />
            <div className="absolute top-7 right-4 w-2 h-2 bg-neutral-700 rounded-full" />
            <div className="absolute top-9 left-2 w-2 h-2 bg-red-400/80 rounded-full" />
            <div className="absolute top-9 right-2 w-2 h-2 bg-red-400/80 rounded-full" />
            <div className="absolute bottom-6 w-5 h-2.5 border-b-[3px] border-neutral-700 rounded-b-full" />
          </div>
          {/* Sunbeams (vector representation) */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-6 bg-amber-400 rounded-full"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-54px)`,
              }}
            />
          ))}
        </div>

        {/* Puffy Clouds drifting in sky */}
        <div className="absolute top-14 right-[10%] w-36 h-12 bg-white/90 rounded-full filter blur-[1px]" />
        <div className="absolute top-24 left-[20%] w-28 h-10 bg-white/80 rounded-full filter blur-[1px] opacity-70" />
        <div className="absolute top-8 right-[40%] w-32 h-10 bg-white/85 rounded-full filter blur-[1.5px] opacity-80" />

        {/* Scenic Forest and Nabta Castle Spire silhouette at the base */}
        <div className="absolute bottom-0 inset-x-0 h-44 flex items-end justify-between overflow-hidden">
          {/* Grassy Hills */}
          <div className="absolute bottom-[-15px] left-[-30px] w-[60%] h-36 bg-emerald-500/80 rounded-t-[180px] blur-[1px]" />
          <div className="absolute bottom-[-20px] right-[-40px] w-[55%] h-40 bg-emerald-600/70 rounded-t-[190px]" />
          <div className="absolute bottom-[-10px] inset-x-0 h-24 bg-emerald-400/90 rounded-t-[200px]" />

          {/* Magical Castle structures on the Right representing Nabta */}
          <div className="absolute bottom-3 left-[12%] z-10 flex items-end opacity-90 scale-75 md:scale-100">
            {/* Main Castle Spire */}
            <div className="w-14 h-32 bg-teal-100 border-x-4 border-t-4 border-teal-600/30 rounded-t-lg relative" style={{ background: '#ECEFF1' }}>
              <div className="absolute bottom-0 inset-x-3 h-10 bg-amber-600/20 rounded-t-md" />
              <div className="absolute top-8 left-4 w-5 h-7 bg-amber-400 border-2 border-teal-700 rounded-t-full" />
              {/* Roof */}
              <div className="absolute top-[-34px] left-[-4px] w-16 border-b-[34px] border-b-teal-600 border-x-[16px] border-x-transparent" />
              {/* Little Sprout flag on top of castle - matches Nabta theme */}
              <div className="absolute top-[-44px] left-[23px] w-1.5 h-3 bg-amber-700" />
              <div className="absolute top-[-52px] left-[24px] w-6 h-5 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-tr-xl rounded-bl-xl border border-emerald-600" />
            </div>
            
            {/* Secondary Spire */}
            <div className="w-10 h-24 bg-emerald-50 border-x-4 border-t-4 border-emerald-700/20 rounded-t-sm" style={{ background: '#ECEFF1' }}>
              <div className="absolute top-[-24px] left-[-3px] w-12 border-b-[24px] border-b-amber-500 border-x-[12px] border-x-transparent" />
            </div>
          </div>

          {/* Cute Flowers & Sprouts near base center */}
          <div className="absolute bottom-0 right-[25%] flex space-x-6 z-10 px-4">
            <div className="relative w-4 h-12 bg-emerald-700 rounded-t-full flex items-center justify-center">
              <div className="absolute top-[-8px] w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-500" />
              <div className="absolute top-[-4px] w-4 h-4 bg-red-500 rounded-full" />
            </div>
            <div className="relative w-3 h-10 bg-emerald-600 rounded-t-full flex items-center justify-center">
              <div className="absolute top-[-6px] w-6 h-6 bg-pink-400 rounded-full border-2 border-pink-500" />
              <div className="absolute top-[-3px] w-3 h-3 bg-yellow-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* AUDIO ENGINE CONTROL PANEL (Floating always on top corner - only visible on menu screens to avoid overlapping active game HUD) */}
      {screen !== 'playing' && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <button
            onClick={() => {
              const nextSfx = !isSfxOn;
              setIsSfxOn(nextSfx);
            }}
            className="w-11 h-11 rounded-full bg-white/90 hover:bg-white text-emerald-700 shadow-md flex items-center justify-center transition-all border-2 border-emerald-300 active:scale-95 cursor-pointer"
            title={isSfxOn ? 'كتم المؤثرات الصوتية' : 'تشغيل المؤثرات الصوتية'}
          >
            {isSfxOn ? <Volume2 className="w-5 h-5 text-emerald-600 pointer-events-none" /> : <VolumeX className="w-5 h-5 text-gray-400 opacity-40 pointer-events-none" />}
          </button>

          <button
            onClick={() => {
              const nextVoice = !isVoiceOn;
              setIsVoiceOn(nextVoice);
              if (!nextVoice) {
                window.speechSynthesis.cancel();
              } else {
                audioEngine.speakArabic("تم تشغيل الصوت!");
              }
            }}
            className="w-11 h-11 rounded-full bg-white/90 hover:bg-white text-emerald-700 shadow-md flex items-center justify-center transition-all border-2 border-emerald-300 active:scale-95 cursor-pointer"
            title={isVoiceOn ? 'كتم التوجيهات الصوتية' : 'تشغيل التوجيهات'}
          >
            {isVoiceOn ? <Megaphone className="w-5 h-5 text-teal-600 pointer-events-none" /> : <Megaphone className="w-5 h-5 text-gray-400 opacity-40 pointer-events-none" />}
          </button>

          {screen !== 'start' && screen !== 'about' && (
            <button
              onClick={() => {
                stopGameLoops();
                setScreen('start');
              }}
              className="w-11 h-11 rounded-full bg-white/90 hover:bg-white text-red-600 shadow-md flex items-center justify-center transition-all border-2 border-red-200 active:scale-95 cursor-pointer"
              title="الرئيسية"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* RENDER ACTIVE SCREEN CONTROLLER */}
      <AnimatePresence mode="wait">
        {/* 1. START SCREEN */}
        {screen === 'start' && (
          <motion.div
            key="start"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center select-none overflow-y-auto"
          >
            {/* Main Unified Game Intro & Action Container to ensure everything fits perfectly on all screens */}
            <div className="flex flex-col items-center w-full max-w-lg md:max-w-xl bg-white/85 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-emerald-200">
              
              <div className="text-xs md:text-sm font-black tracking-widest text-emerald-850 bg-emerald-100 rounded-full px-4 md:px-5 py-1 md:py-1.5 mb-2 shadow-inner border border-emerald-300 inline-block">
                بيت نبتة يقدم
              </div>

              <h1 className="text-2xl sm:text-3.5xl md:text-5xl font-black text-emerald-800 select-none tracking-tight leading-snug drop-shadow-sm">
                حارس مملكة الألوان
              </h1>
              
              <p className="text-neutral-600 mt-2 text-xs sm:text-sm md:text-base max-w-xs sm:max-w-md font-bold leading-relaxed">
                لعبة ترفيهية تفاعلية لتنمية مهارات التركيز، الانتباه البصري، ومقاومة المشتتات للأطفال.
              </p>

              {/* Character stands perfectly centered in the layout here */}
              <div className="mt-3 mb-3 flex flex-col items-center justify-center w-full">
                <div className="relative flex items-center justify-center">
                  <GuardianCharacter expression="idle" className="w-[110px] h-[121px] sm:w-[170px] sm:h-[187px]" />
                </div>
                <div className="bg-emerald-50 text-emerald-950 font-bold px-3 py-1.5 rounded-xl md:rounded-2xl border border-emerald-200 text-[10px] sm:text-xs md:text-sm mt-2 animate-bounce shadow-sm text-center">
                  أهلاً بك يا بطل! أنا حارس المملكة، هل تساعدني؟
                </div>
              </div>

              {/* Prominent, pulsing Start Action Button directly on the card */}
              <div className="flex flex-col items-center gap-2 md:gap-3 w-full max-w-xs mt-1 z-20">
                <button
                  onClick={() => {
                    audioEngine.playPop();
                    setScreen('instructions');
                  }}
                  className="w-full py-2.5 sm:py-3.5 md:py-4 text-lg sm:text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 text-white rounded-xl md:rounded-2xl shadow-xl shadow-teal-500/30 border-b-4 border-teal-700 active:border-b-0 cursor-pointer flex items-center justify-center gap-2 md:gap-3 hover:brightness-105 active:scale-[0.98] transition-all text-center animate-pulse"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 fill-white animate-bounce" />
                  ابدأ اللعبة السحرية
                </button>

                <button
                  onClick={() => {
                    audioEngine.playPop();
                    setScreen('about');
                  }}
                  className="w-full py-1.5 md:py-2 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 text-[11px] sm:text-sm font-bold rounded-lg md:rounded-xl border border-emerald-100 hover:border-emerald-200 active:scale-95 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />
                  معلومات اللعبة والملكية
                </button>
              </div>
            </div>

            {/* Copyright block */}
            <div className="text-neutral-500 bg-white/70 px-3 py-1 rounded-full border border-neutral-200/50 text-[10px] font-semibold mt-3 md:mt-4">
              © جميع الحقوق محفوظة لنبتة ستوديو وبيت نبتة 2026
            </div>
          </motion.div>
        )}

        {/* 2. ABOUT AND CREDITS PAGE */}
        {screen === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
          >
            <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl border-4 border-emerald-300">
              <div className="flex items-center justify-between border-b-2 border-neutral-100 pb-2 mb-3">
                <h2 className="text-lg sm:text-2xl font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <span className="p-1 px-2 bg-emerald-100 rounded-lg text-sm sm:text-base">🌱</span>
                  مطور اللعبة
                </h2>
                <button
                  onClick={() => {
                    audioEngine.playPop();
                    setScreen('start');
                  }}
                  className="p-1 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="text-center py-2 flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-tr from-emerald-500 to-amber-400 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md shadow-emerald-400/20 mb-2 animate-bounce">
                  🌱
                </div>

                <h3 className="text-base sm:text-xl font-bold text-neutral-800">
                  نبتة ستوديو | بيت نبتة
                </h3>
                <p className="text-emerald-700 font-bold text-xs mt-0.5">Nabta Studio | Bait Nabta</p>

                <div className="border-t border-b border-dashed border-neutral-200 py-2 sm:py-3 my-2.5 sm:my-3 w-full text-right text-[10px] sm:text-xs md:text-sm text-neutral-600 space-y-1.5 leading-relaxed">
                  <p>
                    <strong>رؤية اللعبة:</strong> تهدف هذه اللعبة إلى قياس وتحسين مدى انتباه وتركيز الطفل البصري وتطوير المرونة الإدراكية من خلال أنشطة تفاعلية أعدت خصيصاً على أسس مدروسة لمقاومة المشتتات الطائرة.
                  </p>
                  <p>
                    <strong>الفئة المستهدفة:</strong> جميع الأطفال ومحبي المغامرات التعليمية.
                  </p>
                  <p>
                    <strong>حقوق الملكية الفكرية:</strong> تم تطوير هذه اللعبة بالكامل كأصل تعليمي وترفيهي مرخص ومحمي.
                  </p>
                </div>

                <div className="bg-emerald-50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-emerald-200 text-[10px] sm:text-xs text-center text-emerald-800 w-full font-bold leading-normal">
                  تم تطوير هذه اللعبة بواسطة: <br />
                  <span className="text-xs sm:text-base text-teal-800 font-extrabold">نبتة ستوديو | بيت نبتة</span>
                  <p className="mt-0.5 font-medium select-text">© جميع الحقوق محفوظة لنبتة ستوديو وبيت نبتة 2026</p>
                </div>
              </div>

              <button
                onClick={() => {
                  audioEngine.playPop();
                  setScreen('start');
                }}
                className="w-full mt-3 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-base font-bold rounded-xl md:rounded-2xl transition-all shadow-md flex items-center justify-center gap-1"
              >
                العودة للرئيسية
              </button>
            </div>
          </motion.div>
        )}

        {/* 3. INSTRUCTIONS SCREEN */}
        {screen === 'instructions' && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center select-none overflow-y-auto"
          >
            <div className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-emerald-300">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-center text-emerald-800 mb-2 md:mb-4">
                كيف نلعب كالحراس؟ 🛡️
              </h2>

              <div className="space-y-2.5 sm:space-y-4 text-right leading-relaxed mb-4 md:mb-6">
                <div className="flex items-start gap-2.5 md:gap-3">
                  <div className="bg-amber-100 p-1.5 sm:p-2.5 rounded-full text-base sm:text-xl mt-0.5">🎈</div>
                  <div>
                    <h3 className="font-extrabold text-neutral-800 text-xs sm:text-sm md:text-lg">فرقع وحافظ على المملكة</h3>
                    <p className="text-neutral-600 text-[10px] sm:text-sm">سوف تطير بالونات ملونة من الأسفل للأعلى. فرقع فقط المطلوبة في أعلى الشاشة.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 md:gap-3">
                  <div className="bg-emerald-100 p-1.5 sm:p-2.5 rounded-full text-base sm:text-xl mt-0.5">💚</div>
                  <div>
                    <h3 className="font-extrabold text-neutral-800 text-xs sm:text-sm md:text-lg">مجموع النقاط والقلوب</h3>
                    <p className="text-neutral-600 text-[10px] sm:text-sm">البالون الصحيح يعطي <span className="text-emerald-600 font-bold">+١٠</span>، وتفويت بالون مطلوب أو فرقعة لون خاطئ يخصم <span className="text-red-500 font-bold">-٥</span> ويفقدك قلباً.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 md:gap-3">
                  <div className="bg-pink-100 p-1.5 sm:p-2.5 rounded-full text-base sm:text-xl mt-0.5">🦋</div>
                  <div>
                    <h3 className="font-extrabold text-neutral-800 text-xs sm:text-sm md:text-lg">تجاهل المشتتات السحرية</h3>
                    <p className="text-neutral-600 text-[10px] sm:text-sm">في المستويات المتقدمة ستظهر فراشات، نجوم، وسحب طائرة. إياك ولمسها، دعها تطير بسلام!</p>
                  </div>
                </div>
              </div>

              {/* Levels Overview List */}
              <div className="bg-emerald-50 rounded-xl md:rounded-2xl p-2.5 sm:p-4 mb-3 md:mb-4 border border-emerald-150">
                <h4 className="font-extrabold text-emerald-800 mb-1.5 md:mb-2 border-b border-emerald-200 pb-1 text-xs sm:text-sm md:text-base">خريطة المستويات الخمسة:</h4>
                <div className="grid grid-cols-2 xs:grid-cols-5 gap-1.5 md:gap-2 text-[9px] sm:text-xs">
                  <div className="bg-white p-1.5 rounded-lg text-center border shadow-sm">
                    <span className="font-bold text-emerald-600">المستوى ١</span>
                    <p className="text-neutral-500 font-semibold text-[8px] sm:text-[10px]">بالونات حمراء</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg text-center border shadow-sm">
                    <span className="font-bold text-emerald-600">المستوى ٢</span>
                    <p className="text-neutral-500 font-semibold text-[8px] sm:text-[10px]">حمراء وصفراء</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg text-center border shadow-sm">
                    <span className="font-bold text-emerald-600">المستوى ٣</span>
                    <p className="text-neutral-500 font-semibold text-[8px] sm:text-[10px]">مهمة متغيرة</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg text-center border shadow-sm">
                    <span className="font-bold text-emerald-600">المستوى ٤</span>
                    <p className="text-neutral-500 font-semibold text-[8px] sm:text-[10px]">تجنب الفراشات</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg text-center border shadow-sm col-span-2 xs:col-span-1">
                    <span className="font-bold text-emerald-600">المستوى ٥</span>
                    <p className="text-neutral-500 font-semibold text-[8px] sm:text-[10px]">التحدي الأعظم</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 md:gap-3">
                <button
                  onClick={() => {
                    audioEngine.playPop();
                    setScreen('start');
                  }}
                  className="w-1/3 py-2 sm:py-3.5 bg-neutral-200 text-neutral-800 text-xs sm:text-base font-bold rounded-xl md:rounded-2xl transition-all hover:bg-neutral-300 active:scale-95"
                >
                  تراجع
                </button>
                <button
                  onClick={() => {
                    audioEngine.playPop();
                    setScreen('playing');
                    setCurrentLevelIdx(0);
                  }}
                  className="w-2/3 py-2 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-base md:text-lg font-black rounded-xl md:rounded-2xl border-b-4 border-emerald-800 active:border-b-0 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-emerald-600/10 transition-all"
                >
                  مستعد، هيا بنا!
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. ACTIVE GAME SCREEN */}
        {screen === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full h-full flex flex-col justify-between select-none"
          >
            {/* TOP BAR / GAMEPLAY HUD */}
            <header className="w-full bg-white/95 backdrop-blur-md border-b-2 md:border-b-4 border-emerald-200 shadow-md px-3 py-1.5 md:py-2 z-30 transition-all flex flex-col gap-1.5 md:gap-2">
              
              {/* TOP SLIM NAVIGATION & QUICK SETTINGS BAR (Prevents layout overlaps on mobile viewports) */}
              <div className="flex items-center justify-between w-full max-w-7xl mx-auto border-b border-emerald-100/80 pb-1 md:pb-1.5 mb-0.5">
                {/* Back / Exit Button */}
                <button
                  onClick={() => {
                    stopGameLoops();
                    setScreen('start');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-[10px] sm:text-xs font-black border border-red-250 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>خروج</span>
                </button>

                {/* Quick Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[9px] sm:text-[11px] font-bold text-emerald-800/80 ml-1">خيارات:</span>
                  
                  <button
                    onClick={() => {
                      const nextSfx = !isSfxOn;
                      setIsSfxOn(nextSfx);
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isSfxOn 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' 
                        : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                    }`}
                    title={isSfxOn ? 'كتم المؤثرات الصوتية' : 'تشغيل المؤثرات الصوتية'}
                  >
                    {isSfxOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 opacity-40" />}
                  </button>

                  <button
                    onClick={() => {
                      const nextVoice = !isVoiceOn;
                      setIsVoiceOn(nextVoice);
                      if (!nextVoice) {
                        window.speechSynthesis.cancel();
                      } else {
                        audioEngine.speakArabic("تم تشغيل الصوت");
                      }
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isVoiceOn 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' 
                        : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                    }`}
                    title={isVoiceOn ? 'كتم التوجيهات الصوتية' : 'تشغيل التوجيهات الصوتية'}
                  >
                    {isVoiceOn ? <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> : <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 opacity-40" />}
                  </button>

                  <button
                    onClick={togglePause}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                      isPaused 
                        ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm animate-pulse' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    }`}
                    title={isPaused ? 'استئناف اللعب' : 'إيقاف مؤقت'}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" /> : <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />}
                  </button>
                </div>
              </div>
              
              {/* Row 1: Level Title, Lives-Hearts, Score */}
              <div className="flex items-center justify-between gap-1.5 max-w-7xl mx-auto w-full">
                {/* Level Title and configuration */}
                <div className="flex flex-col text-right">
                  <span className="text-[10px] md:text-sm font-black tracking-wider text-emerald-700"> {currentConfig.title} 👑 </span>
                  <span className="text-[8px] md:text-[11px] text-neutral-500 font-bold max-w-[120px] sm:max-w-xs truncate hidden xs:block">
                    {currentConfig.missionDescription}
                  </span>
                </div>

                {/* Stars / Points Counters */}
                <div className="flex items-center gap-1 md:gap-2 bg-amber-50 border border-amber-300 rounded-full px-2 md:px-4 py-0.5 md:py-1 shadow-sm">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-amber-500 fill-amber-400 animate-pulse" />
                  <span className="text-[10px] md:text-sm font-black text-amber-900 leading-none">
                    نقاطي: <span className="text-xs md:text-base text-amber-600 font-black">{scoreState.points}</span>
                  </span>
                </div>

                {/* 3 Lives / Hearts */}
                <div className="flex items-center gap-1 md:gap-1.5 bg-red-50 border border-red-200 rounded-full px-2 md:px-4 py-0.5 md:py-1 shadow-sm">
                  <span className="text-[10px] md:text-xs font-black text-red-800 ml-0.5 md:ml-1">القلوب:</span>
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-3.5 h-3.5 md:w-5 md:h-5 transition-all duration-300 ${
                        i < scoreState.lives ? 'text-red-500 fill-red-500 scale-100' : 'text-neutral-300 scale-90'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Row 2: Active Instructions Banner with graphic color display (Great for non-reading kids!) */}
              <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full border-t border-dashed border-emerald-150 pt-1.5 md:pt-2.5">
                
                {/* Dynamic Instructions text box */}
                <motion.div
                  className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${
                    targetFlashActive 
                      ? 'from-amber-100 via-amber-200 to-amber-100 border-amber-400' 
                      : 'from-emerald-500 to-teal-600 border-emerald-600'
                  } border rounded-xl md:rounded-2xl py-1 md:py-2 px-2 md:px-4 shadow-inner text-center transition-all`}
                  animate={targetFlashActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.6 }}
                >
                  {/* Glowing Target instruction */}
                  <span className={`text-[11px] sm:text-sm md:text-lg font-black ${targetFlashActive ? 'text-amber-950' : 'text-white'}`}>
                    {currentConfig.id === 3 || currentConfig.id === 5 ? (
                      <>
                        مهمة جديدة: فرقع بالونات باللون{' '}
                        <span className="underline decoration-1 md:decoration-2 text-yellow-300">
                          {getBalloonColorById(activeTargetColorId).nameAr}
                        </span>{' '}
                        فقط!
                      </>
                    ) : (
                      currentConfig.missionDescription
                    )}
                  </span>

                  {/* Sample Balloon Display (So children can visually identify the active color target) */}
                  <div className="flex gap-1 items-center bg-white/20 rounded-full px-1.5 py-0.5">
                    {currentConfig.id === 3 || currentConfig.id === 5 ? (
                      <motion.div
                        className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full border border-white"
                        style={{ backgroundColor: getBalloonColorById(activeTargetColorId).hex }}
                        animate={{ scale: [0.8, 1.2, 0.8] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    ) : (
                      currentConfig.targetColors.map((colorId) => (
                        <div
                          key={colorId}
                          className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: getBalloonColorById(colorId).hex }}
                        />
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Level Progress meter gauge */}
                <div className="w-[30%] sm:w-[25%] flex flex-col">
                  <div className="flex justify-between text-[9px] md:text-[11px] font-bold text-neutral-500 mb-0.5 md:mb-1 leading-none">
                    <span>الهـدف:</span>
                    <span className="text-emerald-700 font-extrabold">
                      {scoreState.correctCount} / {currentConfig.targetCount}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2 md:h-3.5 border border-neutral-300/60 p-0 md:p-0.5">
                    <motion.div
                      className="bg-gradient-to-r from-emerald-500 to-lime-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (scoreState.correctCount / currentConfig.targetCount) * 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Level 5 countdown timer display */}
                {currentConfig.timeLimitSeconds !== undefined && (
                  <div className="flex flex-col items-center justify-center bg-red-50 border border-red-300 rounded-lg md:rounded-xl px-1.5 md:px-3 py-0.5 font-mono">
                    <span className="text-[8px] md:text-[10px] font-bold text-red-500">الـوقـت</span>
                    <span className="text-xs md:text-sm font-black text-red-700">{timeRemaining}ث</span>
                  </div>
                )}
              </div>
            </header>

            {/* MAIN GAMEPLAY AREA CANVAS */}
            <main className="flex-1 relative w-full h-full overflow-hidden mt-1 z-10">
              
              {/* Pause Overlay cover */}
              {isPaused && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white/95 border-4 border-amber-300 rounded-2xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl flex flex-col items-center"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-50 flex items-center justify-center border-4 border-amber-200 mb-3 animate-pulse">
                      <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 fill-amber-300" />
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-black text-amber-800 mb-1">اللعبة متوقفة مؤقتًا ⏸️</h3>
                    <p className="text-xs sm:text-sm text-neutral-600 font-bold mb-4">
                      خُذْ نَفَسًا عَمِيقًا يَا بَطَلُ، ثُمَّ أَكْمِلْ عِنْدَمَا تَكُونُ مُسْتَعِدًّا!
                    </p>

                    <button
                      onClick={togglePause}
                      className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-xl md:rounded-2xl border-b-4 border-teal-800 active:border-b-0 cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>اسْتِئْنَافُ اللَّعِبِ</span>
                    </button>
                  </motion.div>
                </div>
              )}

              {/* Level Intro Overlay Cover - Displays clear instructions and visual guide before starting */}
              {isLevelIntroActive && (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-md z-[99] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white/95 border-4 border-emerald-400 rounded-2xl md:rounded-3xl p-5 sm:p-7 max-w-md w-full text-center shadow-2xl flex flex-col items-center select-none"
                  >
                    {/* Badge */}
                    <div className="text-xs md:text-sm font-black tracking-widest text-emerald-800 bg-emerald-100 rounded-full px-4 py-1 mb-2 shadow-inner border border-emerald-300">
                      مستعد للمستوى {currentLevelIdx + 1} ؟ 🌱
                    </div>

                    {/* Level Title */}
                    <h3 className="text-xl sm:text-2xl md:text-3.5xl font-black text-emerald-800 mb-1">
                      {currentConfig.title}
                    </h3>
                    
                    {/* Mission Instruction in huge friendly text */}
                    <p className="bg-emerald-50 text-emerald-950 font-bold px-4 py-3 rounded-xl border border-emerald-200 text-xs sm:text-sm md:text-base mb-4 max-w-xs sm:max-w-md w-full leading-relaxed shadow-sm">
                      {currentConfig.missionDescription}
                    </p>

                    {/* Visual Target Guide */}
                    <div className="w-full text-right mb-4">
                      <h4 className="text-[11px] sm:text-xs font-black text-emerald-700/80 mb-2 border-b border-dashed border-emerald-250 pb-1 flex items-center gap-1">
                        🎯 بالونات مطلوب فرقعتها:
                      </h4>
                      <div className="flex flex-wrap gap-2.5 justify-center items-center py-2 bg-emerald-50/40 rounded-xl border border-emerald-100 shadow-inner">
                        {currentConfig.id === 3 || currentConfig.id === 5 ? (
                          <div className="flex flex-col items-center gap-1.5 p-1">
                            <div className="flex gap-1.5">
                              {COLOR_LIST.map((color) => (
                                <div
                                  key={color.id}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white shadow-md relative group flex items-center justify-center text-white font-bold text-[10px]"
                                  style={{ backgroundColor: color.hex }}
                                >
                                  🔄
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-amber-800 font-extrabold max-w-[280px] text-center leading-normal">
                              ⚠ بالونات الألوان ستتغير باستمرار! انتبه للتعليمات الصوتية والشريط العلوي.
                            </span>
                          </div>
                        ) : (
                          currentConfig.targetColors.map((colorId) => {
                            const colorObj = getBalloonColorById(colorId);
                            return (
                              <div key={colorId} className="flex items-center gap-1.5 bg-white border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">
                                <div
                                  className="w-5 h-5 rounded-full border border-neutral-300"
                                  style={{ backgroundColor: colorObj.hex }}
                                />
                                <span className="text-xs font-extrabold text-neutral-800">{colorObj.nameAr}</span>
                                <span className="text-emerald-500 font-black">✓</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Visual Distractor Guide (if allowed) */}
                    {currentConfig.allowDistractions && currentConfig.distractors.length > 0 && (
                      <div className="w-full text-right mb-5">
                        <h4 className="text-[11px] sm:text-xs font-black text-rose-700 mb-2 border-b border-dashed border-rose-250 pb-1 flex items-center gap-1">
                          🚫 أشياء تجنب لمسها (مشتتات):
                        </h4>
                        <div className="flex flex-wrap gap-2 justify-center items-center py-2 bg-red-50/40 rounded-xl border border-rose-100 shadow-inner">
                          {currentConfig.distractors.map((type) => {
                            let label = '';
                            let icon = '';
                            if (type === 'butterfly') { label = 'فراشة'; icon = '🦋'; }
                            if (type === 'star') { label = 'نجم'; icon = '⭐'; }
                            if (type === 'gift') { label = 'هدية'; icon = '🎁'; }
                            if (type === 'cloud') { label = 'سحابة'; icon = '☁️'; }
                            
                            return (
                              <div key={type} className="flex items-center gap-1 bg-white border border-rose-150 px-2 py-0.5 rounded-full shadow-sm">
                                <span className="text-sm">{icon}</span>
                                <span className="text-[10px] sm:text-xs font-extrabold text-neutral-700">{label}</span>
                                <span className="text-red-500 font-black">✗</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Play Start Action Button inside card */}
                    <button
                      onClick={startLevelGameplay}
                      className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white text-base sm:text-lg font-black rounded-xl md:rounded-2xl border-b-4 border-emerald-800 active:border-b-0 cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span>جاهز يا بطل! انطلق 🚀</span>
                    </button>
                  </motion.div>
                </div>
              )}
              
              {/* Render balloons and flying items */}
              {floatingItems.map((item) => {
                const isTarget = item.type === 'balloon' && 
                  (currentConfig.id === 3 || currentConfig.id === 5 
                    ? item.colorId === activeTargetColorId 
                    : currentConfig.targetColors.includes(item.colorId));

                return (
                  <FloatingElement
                    key={item.id}
                    item={item}
                    onPop={handleItemPopped}
                    isTarget={isTarget}
                  />
                );
              })}

              {/* Animated Floating stars/glitter for success multipliers */}
              {sparklePoints.map((p) => (
                <div
                  key={p.id}
                  className="absolute z-40 pointer-events-none"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-amber-400"
                      initial={{ scale: 0.5, opacity: 1, x: 0, y: 0 }}
                      animate={{
                        scale: [0.5, 1.4, 0.2],
                        opacity: [1, 0.9, 0],
                        x: (Math.random() - 0.5) * 140,
                        y: (Math.random() - 0.5) * 140,
                        rotate: Math.random() * 360
                      }}
                      transition={{ duration: 1.0, ease: 'easeOut' }}
                    >
                      <Sparkles className="w-6 h-6 fill-amber-300" />
                    </motion.div>
                  ))}
                </div>
              ))}

              {/* Speech / comfort overlay popup box */}
              {showEncouragePopup && (
                <div className="absolute inset-x-4 top-12 z-50 flex justify-center pointer-events-none select-none">
                  <motion.div
                    initial={{ y: -30, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.8 }}
                    className="bg-yellow-400 border-4 border-emerald-400 px-6 py-3 rounded-2xl shadow-xl text-yellow-950 font-black text-center text-sm md:text-base flex items-center gap-2"
                  >
                    <span>🌟</span>
                    {showEncouragePopup}
                    <span>🌟</span>
                  </motion.div>
                </div>
              )}

              {/* Central Mascot Column representing instructions & character avatar inside sandbox */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center">
                <GuardianCharacter expression={guardianExpression} className="w-[80px] h-[88px] sm:w-[130px] sm:h-[143px]" />

                {/* Help tip card bubble */}
                <div className="bg-white/95 border border-teal-300 rounded-lg px-2.5 py-1 mt-1 shadow-md max-w-[170px] text-center">
                  <p className="text-[9px] md:text-[11px] font-bold text-teal-800 leading-tight">
                    {currentConfig.id === 4 || currentConfig.id === 5 
                      ? 'تجنب لمس الفراشات والنجوم الطائرة!' 
                      : 'فرقع البالونات المطلوبة بسرعة قبل أن تصل للأعلى!'}
                  </p>
                </div>
              </div>
            </main>
          </motion.div>
        )}

        {/* 5. LEVEL COMPLETED REWARD SCREEN */}
        {screen === 'level_complete' && (
          <motion.div
            key="level_complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center select-none overflow-y-auto"
          >
            <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-emerald-300 text-center flex flex-col items-center">
              {/* Confetti sparkle icon */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center border-4 border-amber-300 shadow-md mb-2 sm:mb-4 animate-bounce">
                <Award className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-800">
                أحسنت يا بطل! رائع! 🏆
              </h2>
              <p className="text-neutral-600 mt-1 sm:mt-2 text-xs sm:text-base md:text-lg">
                لقد أنجزت {currentConfig.title} بكل براعة وذكاء!
              </p>

              {/* Score breakdown metrics details */}
              <div className="bg-emerald-50 rounded-xl md:rounded-2xl p-3 sm:p-4 w-full my-2.5 sm:my-5 border border-emerald-100 text-right space-y-1.5 sm:space-y-2">
                <h3 className="font-extrabold text-emerald-800 border-b border-emerald-200 pb-1 text-xs sm:text-base">ملخص الأداء للمستوى:</h3>
                <div className="flex justify-between text-neutral-700 text-xs sm:text-base font-bold">
                  <span>البالونات المفرقعة بنجاح:</span>
                  <span className="text-emerald-600 font-extrabold">{scoreState.correctCount} بالونة</span>
                </div>
                {scoreState.errorCount > 0 && (
                  <div className="flex justify-between text-neutral-700 text-xs sm:text-base font-bold">
                    <span>عدد الأخطاء المرتكبة:</span>
                    <span className="text-red-500 font-extrabold">{scoreState.errorCount} أخطاء</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-700 text-xs sm:text-base font-bold border-t border-dashed border-emerald-200 pt-1.5 sm:pt-2">
                  <span>مجموع النقاط الحالي:</span>
                  <span className="text-amber-600 font-black">{scoreState.points} نقطة</span>
                </div>
              </div>

              {/* Dynamic 3 Star System for young kids praise */}
              <div className="flex gap-1.5 sm:gap-2.5 mb-3 sm:mb-5 justify-center">
                {[...Array(3)].map((_, i) => {
                  const errorCount = scoreState.errorCount;
                  let isStarred = true;
                  if (i === 2 && errorCount >= 2) isStarred = false; 
                  if (i === 1 && errorCount >= 5) isStarred = false; 

                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15 * i, type: 'spring' }}
                    >
                      <Star
                        className={`w-6 h-6 sm:w-10 sm:h-10 ${
                          isStarred ? 'text-amber-400 fill-amber-300' : 'text-neutral-200'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Celebrating Mascot character display */}
              <div className="mb-3">
                <GuardianCharacter expression="celebrate" className="w-[90px] h-[99px] sm:w-[130px] sm:h-[143px]" />
              </div>

              {/* Next level controller button */}
              <button
                onClick={() => {
                  audioEngine.playPop();
                  navigateNextLevel();
                }}
                className="w-full py-2.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-base sm:text-xl font-bold rounded-xl md:rounded-2xl border-b-4 border-teal-700 active:border-b-0 shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {currentLevelIdx === LEVELS.length - 1 ? (
                  <>
                    استلم التاج الملكي! 👑
                  </>
                ) : (
                  <>
                    الذهاب للمستوى التالي
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </>
                )}
              </button>
            </div>

            {/* Intellectual Copyright Warning Footer */}
            <div className="text-neutral-500 bg-white/70 px-3 py-1 rounded-full border border-neutral-200/50 text-[10px] font-semibold mt-3">
              © جميع الحقوق محفوظة لنبتة ستوديو وبيت نبتة 2026
            </div>
          </motion.div>
        )}

        {/* 6. COMFORTING GAME OVER / RETRY SCREEN */}
        {screen === 'game_over' && (
          <motion.div
            key="game_over"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center select-none overflow-y-auto"
          >
            <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-rose-300 text-center flex flex-col items-center">
              
              {/* Comforting heart outline icon */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-300 shadow-md mb-2 sm:mb-4 animate-pulse">
                <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-rose-700">
                محاولة رائعة يا بطل! ❤️
              </h2>
              <p className="text-neutral-600 mt-1 sm:mt-2 text-xs sm:text-base md:text-lg">
                لقد بذلت جهداً كبيراً كالحراس المخلصين! الخطأ هو صديق ذكي نصل عبره للصواب.
              </p>

              {/* Encouragement Speech bubble */}
              <div className="my-2.5 sm:my-5 bg-rose-50/80 rounded-xl md:rounded-2xl p-3 sm:p-4 border border-rose-100 max-w-md w-full">
                <p className="text-neutral-600 font-bold text-xs sm:text-sm leading-relaxed text-right md:text-center">
                  💡 <strong>نصيحة الحارس الذكي:</strong> انظر دائمًا لنموذج الألوان في أعلى الشاشة وركز جيدا حتى لا تفوت البالون المطلوب!
                </p>
              </div>

              <div className="mb-3">
                <GuardianCharacter expression="sad" className="w-[90px] h-[99px] sm:w-[130px] sm:h-[143px]" />
              </div>

              {/* Action Retry button */}
              <div className="flex gap-2.5 sm:gap-4 w-full">
                <button
                  onClick={() => {
                    audioEngine.playPop();
                    setScreen('start');
                  }}
                  className="w-1/3 py-2 sm:py-3.5 bg-neutral-200 text-neutral-800 text-xs sm:text-base font-bold rounded-xl md:rounded-2xl transition-all hover:bg-neutral-300"
                >
                  الرئيسية
                </button>
                <button
                  onClick={() => {
                    audioEngine.playPop();
                    retryLevel();
                  }}
                  className="w-2/3 py-2 sm:py-3.5 bg-rose-500 hover:bg-rose-600 active:border-b-0 text-white text-xs sm:text-lg font-black rounded-xl md:rounded-2xl border-b-4 border-rose-700 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shadow-md transition-all"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:animate-spin-slow" />
                  حاول مرة أخرى
                </button>
              </div>
            </div>

            {/* Intellectual Copyright Warning Footer */}
            <div className="text-neutral-500 bg-white/70 px-3 py-1 rounded-full border border-neutral-200/50 text-[10px] font-semibold mt-3">
              © جميع الحقوق محفوظة لنبتة ستوديو وبيت نبتة 2026
            </div>
          </motion.div>
        )}

        {/* 7. GRAND VICTORY / ALL LEVELS ACCOMPLISHED */}
        {screen === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center select-none overflow-y-auto"
          >
            <div className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-yellow-400 text-center flex flex-col items-center">
              
              {/* Big Golden Crown */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center border-4 border-yellow-500 shadow-xl mb-2 sm:mb-4"
              >
                <span className="text-3xl sm:text-4xl">👑</span>
              </motion.div>

              <div className="bg-yellow-100 text-yellow-900 border border-yellow-300 text-[10px] sm:text-xs font-black tracking-wider px-4 sm:px-5 py-1 rounded-full shadow-sm mb-2 sm:mb-3">
                لقد أنقذت مملكة الألوان بالكامل! 🎈🌱
              </div>

              <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-emerald-800 leading-tight">
                الحارس الأعظم للمملكة!
              </h2>
              
              <p className="text-neutral-600 mt-1 sm:mt-2 text-xs sm:text-base md:text-lg max-w-xs sm:max-w-sm font-medium">
                يا لك من بطل ذكي ومثابر! حصلت بجدارة على وسام الشرف لتفوقك وتركيزك الرائع.
              </p>

              {/* Splendid overall statistics */}
              <div className="bg-yellow-50/70 border-2 border-yellow-250 rounded-xl md:rounded-2xl p-3 sm:p-5 my-2.5 sm:my-5 w-full text-right space-y-1.5 sm:space-y-2.5">
                <h3 className="font-extrabold text-amber-900 text-center text-sm sm:text-lg border-b border-yellow-200 pb-1.5 flex items-center justify-center gap-1 sm:gap-1.5">
                  🛡️ وسام حارس مملكة الألوان الأعظم 🛡️
                </h3>
                <div className="flex justify-between items-center text-neutral-800 text-xs sm:text-base font-bold">
                  <span>تم تطوير التركيز بنسبة:</span>
                  <span className="text-emerald-700 font-extrabold text-xs sm:text-base">١٠٠٪ ممتاز</span>
                </div>
                <div className="flex justify-between items-center text-neutral-800 text-xs sm:text-base font-bold">
                  <span>سرعة الانتباه والاستجابة:</span>
                  <span className="text-teal-700 font-extrabold text-xs sm:text-base">بطل فائق التركيز</span>
                </div>
                <div className="flex justify-between items-center text-neutral-800 text-xs sm:text-base font-bold border-t border-yellow-200 pt-1.5 sm:pt-2.5">
                  <span className="text-amber-950 font-black text-xs sm:text-base">إجمالي النقاط المكتسبة:</span>
                  <span className="text-sm sm:text-2xl text-amber-600 font-black">{scoreState.points} نقطة</span>
                </div>
              </div>

              {/* Celebrating Mascot character display */}
              <div className="mb-3">
                <GuardianCharacter expression="celebrate" className="w-[90px] h-[99px] sm:w-[130px] sm:h-[143px]" />
              </div>

              {/* Play again button */}
              <button
                onClick={() => {
                  audioEngine.playPop();
                  resetEntireGame();
                }}
                className="w-full py-2.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-base sm:text-xl font-bold rounded-xl md:rounded-2xl border-b-4 border-teal-700 active:border-b-0 shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
                العب مجدداً من البداية
              </button>
            </div>

            {/* Intellectual Copyright Warning Footer */}
            <div className="text-neutral-500 bg-white/70 px-3 py-1 rounded-full border border-neutral-200/50 text-[10px] font-semibold mt-3">
              © جميع الحقوق محفوظة لنبتة ستوديو وبيت نبتة 2026
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
