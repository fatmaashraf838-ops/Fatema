/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;
let bgmInterval: any = null;
let bgmStep = 0;
let isMusicEnabled = true;
let isSfxEnabled = true;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Minimal cute background rhythmic beats
const MELODY = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major scale

const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.00;
const F4 = 349.23;
const A4 = 440.00;
const C5 = 523.25;
const B4 = 493.88;
const D5 = 587.33;

const CHORDS = [
  [ C4, E4, G4 ],
  [ F4, A4, C5 ],
  [ G4, B4, D5 ],
  [ C4, E4, G4 ],
];

export const audioEngine = {
  get isMusicOn() {
    return isMusicEnabled;
  },
  get isSfxOn() {
    return isSfxEnabled;
  },

  toggleMusic(on: boolean) {
    isMusicEnabled = on;
    if (!on) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  },

  toggleSfx(on: boolean) {
    isSfxEnabled = on;
  },

  playPop() {
    if (!isSfxEnabled) return;
    try {
      const ctx = initAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch (e) {
      console.warn('Audio pop sound error:', e);
    }
  },

  playCorrect() {
    if (!isSfxEnabled) return;
    try {
      const ctx = initAudioContext();
      const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Playful rising arpeggio
      playNote(392.00, 0, 0.15, 'triangle');   // G4
      playNote(523.25, 0.08, 0.15, 'triangle'); // C5
      playNote(659.25, 0.16, 0.25, 'sine');     // E5
    } catch (e) {
      console.warn('Audio correct sound error:', e);
    }
  },

  playIncorrect() {
    if (!isSfxEnabled) return;
    try {
      const ctx = initAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Audio incorrect sound error:', e);
    }
  },

  playLevelComplete() {
    if (!isSfxEnabled) return;
    try {
      const ctx = initAudioContext();
      const play = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Upbeat fan-fare
      play(261.63, 0, 0.15);     // C4
      play(329.63, 0.1, 0.15);   // E4
      play(392.00, 0.2, 0.15);   // G4
      play(523.25, 0.3, 0.3);    // C5
      play(659.25, 0.45, 0.5);   // E5
    } catch (e) {
      console.warn('Audio level completed sound error:', e);
    }
  },

  playGameComplete() {
    if (!isSfxEnabled) return;
    try {
      const ctx = initAudioContext();
      const play = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Grand celebration chord progression
      const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      arpeggio.forEach((f, i) => {
        play(f, i * 0.12, 0.6, 'sine');
      });
    } catch (e) {
      console.warn('Audio game completed sound error:', e);
    }
  },

  startMusic() {
    if (!isMusicEnabled) return;
    try {
      initAudioContext();
      this.stopMusic();

      // Soft simple ambient synthesizer pattern to avoid blocking the audio thread or annoying the user
      bgmInterval = setInterval(() => {
        if (!isMusicEnabled) return;
        const ctx = initAudioContext();
        if (ctx.state === 'suspended') return;

        // Background gentle harmonic sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        // Cycles through beautiful soft notes
        const scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00]; // G3, A3, C4, D4, E4, G4
        const rootFreq = scale[bgmStep % scale.length];
        
        osc.frequency.setValueAtTime(rootFreq, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime); // very quiet background pad
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);

        osc.start();
        osc.stop(ctx.currentTime + 1.9);

        // Occasional higher chime (every 4 beats)
        if (bgmStep % 4 === 0) {
          const chime = ctx.createOscillator();
          const chimeGain = ctx.createGain();
          chime.connect(chimeGain);
          chimeGain.connect(ctx.destination);
          
          chime.type = 'triangle';
          const chimeNotes = [523.25, 587.33, 659.25, 783.99]; // High C, D, E, G
          const chimeFreq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
          
          chime.frequency.setValueAtTime(chimeFreq, ctx.currentTime + 0.2);
          chimeGain.gain.setValueAtTime(0.015, ctx.currentTime + 0.2);
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

          chime.start(ctx.currentTime + 0.2);
          chime.stop(ctx.currentTime + 1.4);
        }

        bgmStep++;
      }, 1000);
    } catch (e) {
      console.warn('Failed to start loop:', e);
    }
  },

  stopMusic() {
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  },

  speakArabic(text: string) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Terminate ongoing speech instantly
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-EG'; // default Egyptian / Arab dialect
      utterance.rate = 0.85;   // spoken in a clear, friendly, and unhurried rhythm for kids
      utterance.pitch = 1.05;  // slightly lower high pitch for male animated cartoon character
      
      // Query available voices
      const voices = window.speechSynthesis.getVoices();
      
      // Attempt to identify a male Arabic voice (e.g. maged, tarik, naayf, hamdan, shakir, youssef, salim, standard/wavenet with -b, -c, -d suffix)
      const malePattern = /(male|maged|tarik|naayf|shakir|youssef|hamdan|salim|\-b|\-c|\-d)/i;
      const femalePattern = /(female|laila|hoda|zeina|mariam|amina|\-a)/i;
      
      let arabicVoice = voices.find(v => {
        const langStr = v.lang.toLowerCase();
        const nameStr = v.name.toLowerCase();
        const isAr = langStr.includes('ar-') || langStr === 'ar';
        return isAr && malePattern.test(nameStr);
      });
      
      if (!arabicVoice) {
        // If we couldn't find an explicit male voice, look for an Arabic voice that is not explicitly female
        arabicVoice = voices.find(v => {
          const langStr = v.lang.toLowerCase();
          const nameStr = v.name.toLowerCase();
          const isAr = langStr.includes('ar-') || langStr === 'ar';
          return isAr && !femalePattern.test(nameStr);
        });
      }
      
      if (!arabicVoice) {
        // Fallback to any Arabic voice
        arabicVoice = voices.find(v => {
          const langStr = v.lang.toLowerCase();
          return langStr.includes('ar-') || langStr === 'ar';
        });
      }

      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
};
