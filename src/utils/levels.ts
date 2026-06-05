/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelConfig, BalloonColor } from '../types';

export const COLOR_LIST: BalloonColor[] = [
  { id: 'red', nameAr: 'الأحمر', hex: '#EF4444' },     // Red
  { id: 'yellow', nameAr: 'الأصفر', hex: '#FACC15' },  // Yellow
  { id: 'blue', nameAr: 'الأزرق', hex: '#3B82F6' },    // Blue
  { id: 'green', nameAr: 'الأخضر', hex: '#22C55E' },   // Green
  { id: 'orange', nameAr: 'البرتقالي', hex: '#F97316' }, // Orange
  { id: 'purple', nameAr: 'البنفسجي', hex: '#A855F7' },  // Purple
];

export const getBalloonColorById = (id: string): BalloonColor => {
  return COLOR_LIST.find(c => c.id === id) || COLOR_LIST[0];
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: 'المستوى الأول: صائد الألوان',
    missionDescription: 'فرقع البالونات الحمراء فقط!',
    voicePrompt: 'مَرْحَبًا بِكَ يَا بَطَلْ! فَرْقِعْ الْبَالُونَاتِ الْحَمْرَاءَ فَقَطْ وَتَجَنَّبْ الْأَلْوَانَ الْأُخْرَى.',
    targetColors: ['red'],
    allowDistractions: false,
    distractors: [],
    speedMultiplier: 1.0,
    spawnRateMs: 1400,
    targetCount: 10,
  },
  {
    id: 2,
    title: 'المستوى الثاني: الحارس الذكي',
    missionDescription: 'فرقع البالونات الحمراء والصفراء فقط!',
    voicePrompt: 'أَنْتَ بَطَلٌ ذَكِيٌّ وَمُمْتَازٌ! الْآنَ، رَكِّزْ جَيِّدًا وَفَرْقِعْ الْبَالُونَاتِ الْحَمْرَاءَ وَالصَّفْرَاءَ فَقَطْ.',
    targetColors: ['red', 'yellow'],
    allowDistractions: false,
    distractors: [],
    speedMultiplier: 1.15,
    spawnRateMs: 1200,
    targetCount: 10,
  },
  {
    id: 3,
    title: 'المستوى الثالث: المهمة المتغيرة',
    missionDescription: 'انتبه! اللون المطلوب سيتغير كل 6 ثوانٍ!',
    voicePrompt: 'يَا بَطَلْ، انْتَبِهْ جَيِّدًا! فِي هَذَا الْمُسْتَوَى، سَوْفَ تَتَغَيَّرُ الْمُهِمَّةُ وَيَتَغَيَّرُ اللَّوْنُ الْمَطْلُوبُ كُلَّ بِضْعِ ثَوَانٍ. اِسْتَمِعْ لِتَوْجِيهَاتِي!',
    targetColors: ['red'], // dynamically managed
    allowDistractions: false,
    distractors: [],
    speedMultiplier: 1.2,
    spawnRateMs: 1100,
    targetCount: 10,
  },
  {
    id: 4,
    title: 'المستوى الرابع: تجاهل المشتتات',
    missionDescription: 'فرقع البالونات الخضراء والزرقاء فقط، وتجنب لمس الفراشات والنجوم والهدايا!',
    voicePrompt: 'يَا بَطَلْ، رَائِعٌ رَائِعٌ! الْآنَ تَظْهَرُ كَائِنَاتٌ طَائِرَةٌ وَمُشَتِّتَاتٌ لِتَخْتَبِرَ تَرْكِيزَكَ. تَذَكَّرْ، فَرْقِعْ الْبَالُونَاتِ الزَّرْقَاءَ وَالْخَضْرَاءَ فَقَطْ، وَلَا تَلْمَسْ الْأَشْيَاءَ الْأُخْرَى!',
    targetColors: ['green', 'blue'],
    allowDistractions: true,
    distractors: ['butterfly', 'star', 'gift', 'cloud'],
    speedMultiplier: 1.25,
    spawnRateMs: 1000,
    targetCount: 10,
  },
  {
    id: 5,
    title: 'المستوى الخامس: حارس المملكة الأعظم',
    missionDescription: 'التحدي الأخير! كل الألوان والمشتتات وتغيير المهام مع مؤقت تنازلي!',
    voicePrompt: 'يَا بَطَلْ، أَنْتَ رَائِعٌ وَمُبْدِعٌ! هَذَا هُوَ التَّحَدِّي الْأَخِيرُ لِتُصْبِحَ حَارِسَ الْمَمْلَكَةِ الْأَعْظَمْ. الْأَلْوَانُ تَتَغَيَّرُ بِاسْتِمْرَار، رَكِّزْ جَيِّدًا وَأَنْهِ الْمُهِمَّةَ سَرِيعًا!',
    targetColors: ['red'], // dynamically managed
    allowDistractions: true,
    distractors: ['butterfly', 'star', 'gift', 'cloud'],
    speedMultiplier: 1.35,
    spawnRateMs: 800,
    targetCount: 15,
    timeLimitSeconds: 45, // 45 seconds countdown
  },
];
