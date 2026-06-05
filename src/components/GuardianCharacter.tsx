/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface GuardianProps {
  expression: 'idle' | 'happy' | 'sad' | 'celebrate';
  size?: number | string; // width in pixels or responsive string
  className?: string;
  animateWand?: boolean;
}

export default function GuardianCharacter({ expression, size, className = '', animateWand = true }: GuardianProps) {
  // Color configuration inspired by Nabta (warm leaf greens, teals, and soft golds)
  const colors = {
    skin: '#FFE0B2',       // soft peachy warm tone
    hair: '#795548',       // chestnut brown
    cape: '#4CAF50',       // primary green
    capeDark: '#2E7D32',   // dark green shadow
    crown: '#FFD700',      // yellow gold
    crownJewels: '#009688',// Nabta teal
    shirt: '#FFFFFF',
    wandGlow: '#FFF59D'
  };

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={size ? { width: size, height: typeof size === 'number' ? size * 1.1 : undefined } : undefined}
    >
      <svg
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Magic Wand Glow (when celebrating or happy) */}
        {(expression === 'happy' || expression === 'celebrate') && (
          <motion.circle
            cx="173"
            cy="48"
            r="25"
            fill="url(#wandGlowGradient)"
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />
        )}

        {/* DEFINITIONS FOR GRADIENTS AND FILTERS */}
        <defs>
          <radialGradient id="wandGlowGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#FFF59D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFF176" stopOpacity="0" />
          </radialGradient>
          <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feOffset dx="0" dy="2" />
            <feComponentTransfer><feFuncA type="linear" slope="0.15" /></feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. ROYAL VELVET CAPE */}
        <path d="M60 120 C 40 130 35 190 40 210 L 160 210 C 165 190 160 130 140 120 Z" fill={colors.capeDark} />
        {/* Internal folds of cape */}
        <path d="M60 120 C 50 140 50 180 55 210" stroke={colors.cape} strokeWidth="3" strokeLinecap="round" />
        <path d="M140 120 C 150 140 150 180 145 210" stroke={colors.cape} strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />

        {/* 2. BODY/SHIRT */}
        <rect x="75" y="115" width="50" height="75" rx="10" fill={colors.shirt} />
        {/* Royal Crest on shirt (sprout leaf) */}
        <path d="M100 135 C 93 135 90 145 100 155 C 110 145 107 135 100 135 Z" fill={colors.cape} />
        <path d="M100 142 C 100 142 102 148 100 155" stroke="#FFE0B2" strokeWidth="1.5" strokeLinecap="round" />

        {/* 3. ARMS */}
        {/* Left Arm: idle context or celebrating */}
        {expression === 'celebrate' ? (
          // Raising a golden trophy
          <g>
            <path d="M60 125 C 40 110 32 85 45 70" stroke={colors.skin} strokeWidth="16" strokeLinecap="round" />
            {/* Trophy */}
            <g transform="translate(18, 42)">
              <rect x="15" y="3" width="18" height="15" rx="3" fill={colors.crown} />
              <path d="M11 3 C 8 3 8 10 15 10" stroke={colors.crown} strokeWidth="3" fill="none" />
              <path d="M37 3 C 40 3 40 10 33 10" stroke={colors.crown} strokeWidth="3" fill="none" />
              <rect x="20" y="18" width="8" height="6" fill={colors.crown} />
              <ellipse cx="24" cy="24" rx="10" ry="3" fill={colors.crown} />
              {/* Jewel */}
              <circle cx="24" cy="10" r="3" fill={colors.crownJewels} />
            </g>
          </g>
        ) : (
          // standard friendly hand
          <path d="M68 125 C 50 135 48 155 52 165" stroke={colors.skin} strokeWidth="14" strokeLinecap="round" />
        )}

        {/* Right Arm: holding magic wand */}
        {expression === 'happy' || expression === 'celebrate' ? (
          // Wave wand high and outward to the right
          <g>
            <path d="M132 125 C 155 110 175 95 170 85" stroke={colors.skin} strokeWidth="14" strokeLinecap="round" />
            {/* Magic Wand tilted away from face */}
            <g transform="translate(170, 45) rotate(-15)">
              <rect x="0" y="8" width="5" height="40" rx="2" fill="#8D6E63" />
              {/* Wand Crown / Flower top to fit Nabta */}
              <circle cx="2.5" cy="4" r="8" fill={colors.crown} />
              {/* Sparkling glowing core */}
              <circle cx="2.5" cy="4" r="4" fill="#FFFFFF" />
              <path d="M-4 4 L9 4 M2.5 -2.5 L2.5 10.5" stroke={colors.crown} strokeWidth="1.5" />
            </g>
          </g>
        ) : (
          // Hold wand normally and comfortably to the side
          <g>
            <path d="M132 125 C 160 135 170 145 165 155" stroke={colors.skin} strokeWidth="14" strokeLinecap="round" />
            {/* Magic Wand */}
            <g transform="translate(165, 105) rotate(-10)">
              <rect x="0" y="8" width="5" height="40" rx="2" fill="#8D6E63" />
              <circle cx="2.5" cy="4" r="7" fill={colors.crown} />
              <circle cx="2.5" cy="4" r="3.5" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* 4. NECK */}
        <rect x="92" y="90" width="16" height="20" rx="4" fill={colors.skin} />

        {/* 5. head & lovely hair */}
        {/* Hair Back */}
        <ellipse cx="100" cy="72" rx="36" ry="34" fill={colors.hair} />
        {/* Face */}
        <circle cx="100" cy="75" r="30" fill={colors.skin} />
        {/* Hair front cheeks / bangs */}
        <path d="M68 65 C 72 52 85 48 100 52 C 115 48 128 52 132 65 C 132 65 128 64 125 61 C 120 58 114 62 110 65 L 105 65 C 103 62 97 62 95 65 L 90 65 C 86 62 80 58 75 61 C 72 64 68 65 68 65 Z" fill={colors.hair} />

        {/* 6. FACE EXPRESSIONS (DYNAMIC) */}
        {_renderFace(expression, colors)}

        {/* 7. THE GOLDEN CROWN WITH SPROUT EMBLEM */}
        <g transform="translate(73, 30)">
          <motion.g 
            animate={expression === 'happy' || expression === 'celebrate' ? {
              y: [0, -4, 0],
              rotate: [0, 2, -2, 0]
            } : {
              y: 0,
              rotate: 0
            }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            style={{ transformOrigin: 'center' }}
          >
            {/* Base band of crown */}
            <path d="M2.5 15 L 51.5 15 L 48.5 21 L 5.5 21 Z" fill={colors.crown} stroke={colors.capeDark} strokeWidth="1" />
            {/* Spikes of crown */}
            <path d="M2.5 15 L 6 0 L 16 11 L 27 -4 L 38 11 L 48 0 L 51.5 15 Z" fill={colors.crown} stroke={colors.capeDark} strokeWidth="1" strokeLinejoin="miter" />
            {/* Little red and teal jewels on crown tips */}
            <circle cx="6" cy="0" r="2.5" fill="#EF4444" />
            <circle cx="27" cy="-4" r="3" fill={colors.crownJewels} />
            <circle cx="48" cy="0" r="2.5" fill="#3B82F6" />
            {/* Micro jewels on base band */}
            <circle cx="15" cy="18" r="1.5" fill="#EF4444" />
            <circle cx="27" cy="18" r="1.5" fill={colors.crownJewels} />
            <circle cx="39" cy="18" r="1.5" fill="#3B82F6" />
          </motion.g>
        </g>

        {/* Cute rosy cheeks (moved down to align with updated face balance) */}
        <circle cx="82" cy="85" r="4" fill="#FF8A80" fillOpacity="0.6" />
        <circle cx="118" cy="85" r="4" fill="#FF8A80" fillOpacity="0.6" />
      </svg>
    </div>
  );
}

function _renderFace(expression: string, colors: any) {
  switch (expression) {
    case 'happy':
      return (
        <g>
          {/* Happy thick laughing arc eyes (moved down to prevent bangs coverage) */}
          <path d="M78 79 Q84 71 90 79" stroke="#4E342E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M110 79 Q116 71 122 79" stroke="#4E342E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          {/* High-contrast eyebrows */}
          <path d="M76 69 Q84 64 88 70" fill="none" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M124 69 Q116 64 112 70" fill="none" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" />
          {/* Big open laughing mouth */}
          <path d="M90 87 Q100 99 110 87 Z" fill="#D84315" stroke="#4E342E" strokeWidth="3" strokeLinejoin="round" />
          <path d="M94 87 L106 87" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'sad':
      return (
        <g>
          {/* Concerned worried eyes (curved downwards, moved down) */}
          <path d="M78 79 Q84 85 90 79" stroke="#4E342E" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M110 79 Q116 85 122 79" stroke="#4E342E" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Sympathetic gentle curved frown */}
          <path d="M92 91 Q100 83 108 91" stroke="#4E342E" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Worried eyebrows */}
          <path d="M76 71 L86 75" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M124 71 L114 75" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'celebrate':
      return (
        <g>
          {/* Winking happy eyes: Left eye is a happy smile wink, Right eye is wide and shining (moved down) */}
          <path d="M76 80 Q84 72 92 80" stroke="#4E342E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          
          {/* Big sparkling open eye on the right */}
          <circle cx="116" cy="78" r="5.5" fill="#4E342E" />
          <circle cx="114" cy="75" r="2" fill="#FFFFFF" />
          <circle cx="118" cy="80" r="1" fill="#FFFFFF" />
          
          {/* Wide cute open smile */}
          <path d="M88 86 Q100 101 112 86 Z" fill="#D84315" stroke="#4E342E" strokeWidth="3" strokeLinejoin="round" />
          {/* Cute white teeth */}
          <path d="M92 86 L108 86" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'idle':
    default:
      return (
        <g>
          {/* Cute prominent round open eyes with shine highlights (moved down) */}
          <circle cx="85" cy="78" r="4.5" fill="#4E342E" />
          <circle cx="115" cy="78" r="4.5" fill="#4E342E" />
          {/* White glints inside the eyes */}
          <circle cx="83.5" cy="75.5" r="1.5" fill="#FFFFFF" />
          <circle cx="113.5" cy="75.5" r="1.5" fill="#FFFFFF" />
          <circle cx="86.5" cy="80.5" r="0.8" fill="#FFFFFF" />
          <circle cx="116.5" cy="80.5" r="0.8" fill="#FFFFFF" />
          {/* Beautiful cute eyebrows */}
          <path d="M76 69 Q84 64 88 70" fill="none" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M124 69 Q116 64 112 70" fill="none" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" />
          {/* Beautiful cute round smile */}
          <path d="M92 85 Q100 92 108 85" stroke="#4E342E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}
