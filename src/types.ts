/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameScreen = 'start' | 'instructions' | 'playing' | 'level_complete' | 'game_over' | 'completed' | 'about';

export interface BalloonColor {
  id: string; // 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple'
  nameAr: string; // 'الأحمر' | 'الأصفر' etc.
  hex: string;
}

export type DistractorType = 'butterfly' | 'star' | 'gift' | 'cloud';

export interface FloatingItem {
  id: string;
  type: 'balloon' | DistractorType;
  colorId: string; // empty string for distractors
  colorHex: string;
  x: number; // horizontal starting percentage (e.g. 10 to 90)
  y: number; // vertical percentage (starts below 110, moves upwards to -10)
  speed: number; // pixels per frame or step speed
  size: number; // diameter in pixels
  isPopped: boolean;
  scoreAwarded: boolean; // avoid double scoring
  shapeIndex: number; // variation of visual appearance
  angle: number; // rotation angle for organic movement
  angleSpeed: number;
}

export interface LevelConfig {
  id: number;
  title: string;
  missionDescription: string;
  voicePrompt: string; // text for text-to-speech
  targetColors: string[]; // ['red'], ['red', 'yellow'] etc.
  allowDistractions: boolean;
  distractors: DistractorType[];
  speedMultiplier: number;
  spawnRateMs: number;
  targetCount: number; // number of correct pops needed to win
  timeLimitSeconds?: number; // Level 5 has a countdown
}

export interface GameScoreState {
  points: number;
  correctCount: number;
  errorCount: number;
  consecutiveCorrect: number;
  lives: number; // 3 hearts
}
