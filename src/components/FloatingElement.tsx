/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { FloatingItem } from '../types';

interface FloatingElementProps {
  key?: React.Key;
  item: FloatingItem;
  onPop: (id: string, isCorrect: boolean) => void;
  isTarget: boolean; // whether this is a target balloon to pop on current instructions
}

export default function FloatingElement({ item, onPop, isTarget }: FloatingElementProps) {
  const { id, type, colorHex, size, isPopped } = item;

  // Render popped feedback if popped
  if (isPopped) {
    return (
      <div
        className="absolute pointer-events-none select-none flex items-center justify-center"
        style={{
          left: `${item.x}%`,
          top: `${item.y}%`,
          width: size,
          height: size,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Colorful explosion shockwave */}
        <motion.div
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute w-full h-full rounded-full border-4"
          style={{ borderColor: type === 'balloon' ? colorHex : '#A855F7' }}
        />
        {/* Sparkles / Stars exploding */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{ backgroundColor: type === 'balloon' ? colorHex : '#FFD700' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * (size * 0.9),
              y: Math.sin((angle * Math.PI) / 180) * (size * 0.9),
              opacity: 0,
              scale: 0.2
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        ))}
        {/* Text Pop Feedback */}
        <motion.div
          className="absolute font-black text-lg text-center"
          style={{
            color: isTarget ? '#4CAF50' : '#EF4444',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          initial={{ y: 0, opacity: 1, scale: 0.5 }}
          animate={{ y: -40, opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6 }}
        >
          {isTarget ? '+١٠' : '-٥'}
        </motion.div>
      </div>
    );
  }

  // Handle interactive click of elements
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // prevent double triggers on mobile
    
    // An item is correct if:
    // 1. It is a balloon and isTarget is true
    // 2. Standard level rules apply
    const isCorrect = type === 'balloon' && isTarget;
    onPop(id, isCorrect);
  };

  return (
    <motion.div
      className="absolute cursor-pointer select-none active:scale-95 touch-none"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        zIndex: type === 'balloon' ? 20 : 10,
      }}
      animate={{
        x: [0, Math.sin(item.angle) * 8, 0],
        rotate: [0, item.angleSpeed * 15, 0],
      }}
      transition={{
        repeat: Infinity,
        duration: 2.5 + (item.shapeIndex % 3),
        ease: "easeInOut"
      }}
      onClick={handleClick}
      onTouchStart={handleClick}
    >
      {/* 2. RENDER THE GRAPHIC ACCORDING TO TYPE */}
      {type === 'balloon' ? (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
          <defs>
            {/* Glossy gradient highlight */}
            <radialGradient id={`grad-${id}`} cx="35%" cy="30%" r="60%" fx="35%" fy="30%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="25%" stopColor={colorHex} />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.85" />
            </radialGradient>
            <linearGradient id={`grad-string-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5D6A7" />
              <stop offset="100%" stopColor="#81C784" />
            </linearGradient>
          </defs>

          {/* Balloon string thread */}
          <path
            d="M50 88 Q 55 102 45 116 T 52 130"
            fill="none"
            stroke="#81C784"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Balloon main shape */}
          <ellipse cx="50" cy="48" rx="38" ry="43" fill={`url(#grad-${id})`} />

          {/* Golden/White highlight reflection circle */}
          <ellipse cx="32" cy="28" rx="8" ry="5" fill="#FFFFFF" opacity="0.5" transform="rotate(-15 32 28)" />

          {/* Balloon knot triangle */}
          <polygon points="44,88 56,88 50,81" fill={colorHex} />

          {/* Smiling, adorable face on balloon */}
          <g opacity="0.85">
            {/* Cute eyes */}
            <circle cx="38" cy="44" r="3.5" fill="#374151" />
            <circle cx="62" cy="44" r="3.5" fill="#374151" />
            <circle cx="39" cy="42.5" r="1.2" fill="#FFFFFF" />
            <circle cx="63" cy="42.5" r="1.2" fill="#FFFFFF" />
            
            {/* Chubby cheeks */}
            <circle cx="31" cy="48" r="3.5" fill="#F87171" opacity="0.6" />
            <circle cx="69" cy="48" r="3.5" fill="#F87171" opacity="0.6" />

            {/* Content smile depending on shape index */}
            {item.shapeIndex % 2 === 0 ? (
              <path d="M43 51 Q50 58 57 51" stroke="#374151" strokeWidth="3" fill="none" strokeLinecap="round" />
            ) : (
              // Open cheerful tongue mouth
              <g>
                <path d="M44 50 L56 50 C56 50 54 59 50 59 C46 59 44 50 44 50 Z" fill="#EF4444" stroke="#374151" strokeWidth="2" strokeLinejoin="round" />
                <line x1="44" y1="50" x2="56" y2="50" stroke="#374151" strokeWidth="2.5" />
              </g>
            )}
          </g>
        </svg>
      ) : type === 'butterfly' ? (
        // Playful fluttery butterfly vector
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm animate-pulse">
          {/* Wings */}
          {/* Left Wing */}
          <path d="M48 50 C 20 20 10 45 42 55 C 20 68 30 90 48 60 Z" fill="#F472B6" stroke="#EC4899" strokeWidth="2" />
          <path d="M30 38 C 22 30 25 42 35 44" fill="none" stroke="#FCE7F3" strokeWidth="2" />
          
          {/* Right Wing */}
          <path d="M52 50 C 80 20 90 45 58 55 C 80 68 70 90 52 60 Z" fill="#F472B6" stroke="#EC4899" strokeWidth="2" />
          <path d="M70 38 C 78 30 75 42 65 44" fill="none" stroke="#FCE7F3" strokeWidth="2" />

          {/* Body */}
          <ellipse cx="50" cy="52" rx="4" ry="18" fill="#4B5563" />
          <circle cx="50" cy="31" r="5" fill="#374151" />
          {/* Antennae */}
          <path d="M48 27 Q 40 15 35 18" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <path d="M52 27 Q 60 15 65 18" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : type === 'star' ? (
        // Smiling shining star
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm animate-spin-slow">
          <path
            d="M50 5 L63 36 L97 38 L71 60 L79 93 L50 75 L21 93 L29 60 L3 38 L37 36 Z"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Face on star */}
          <g>
            <circle cx="42" cy="48" r="3" fill="#4B5563" />
            <circle cx="58" cy="48" r="3" fill="#4B5563" />
            <path d="M46 56 Q50 60 54 56" stroke="#4B5563" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      ) : type === 'gift' ? (
        // Wrapped colorful present box
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* Box base */}
          <rect x="20" y="35" width="60" height="55" rx="5" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="3.5" />
          {/* Box lid */}
          <rect x="15" y="27" width="70" height="13" rx="3" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="3.5" />
          {/* Ribbon */}
          <rect x="44" y="27" width="12" height="63" fill="#FBBF24" />
          <rect x="15" y="55" width="70" height="10" fill="#FBBF24" />
          {/* Cute Bow top */}
          <path d="M42 27 C 32 12 48 10 49 27" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          <path d="M58 27 C 68 12 52 10 51 27" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          {/* Cute smiley eyes on gift box */}
          <g>
            <circle cx="36" cy="65" r="3" fill="#1E3A8A" />
            <circle cx="64" cy="65" r="3" fill="#1E3A8A" />
            <path d="M46 72 Q50 76 54 72" stroke="#1E3A8A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      ) : (
        // Soft smiling cute cloud
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <path
            d="M25 65 C 10 65 5 45 22 42 C 18 20 48 15 55 33 C 65 18 90 22 85 45 C 95 48 95 65 78 65 Z"
            fill="#E0F2FE"
            stroke="#38BDF8"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Face on cloud */}
          <g>
            <circle cx="40" cy="46" r="3" fill="#0369A1" />
            <circle cx="60" cy="46" r="3" fill="#0369A1" />
            <circle cx="34" cy="49" r="2.5" fill="#F472B6" opacity="0.6" />
            <circle cx="66" cy="49" r="2.5" fill="#F472B6" opacity="0.6" />
            <path d="M46 52 Q50 56 54 52" stroke="#0369A1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      )}
    </motion.div>
  );
}
