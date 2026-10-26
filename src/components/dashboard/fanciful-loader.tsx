'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  Atom, 
  Rocket, 
  Compass, 
  Lightbulb, 
  Brain, 
  RefreshCw,
  Stars
} from 'lucide-react';

const FUN_FACTS = [
  {
    icon: Lightbulb,
    title: "Brain Power",
    text: "The human brain can store roughly 2.5 petabytes of data — enough for over 3 million hours of lectures!",
  },
  {
    icon: GraduationCap,
    title: "Historic Milestone",
    text: "The world's oldest existing university, al-Qarawiyyin in Fez, was founded in 859 AD by Fatima al-Fihri.",
  },
  {
    icon: Brain,
    title: "Memory Boost",
    text: "Spaced repetition and active recall can boost long-term memory retention by more than 200%.",
  },
  {
    icon: Rocket,
    title: "Proxima Speed",
    text: "Proxima SMS processes institutional metrics and grading calculations in single-digit milliseconds.",
  },
  {
    icon: BookOpen,
    title: "Wisdom of the Day",
    text: "“Education is the most powerful weapon which you can use to change the world.” — Nelson Mandela",
  },
  {
    icon: Compass,
    title: "Focus Fact",
    text: "Taking a purposeful 5-minute break after 25 minutes of deep study sharpens creative problem solving.",
  },
  {
    icon: Stars,
    title: "Endless Horizons",
    text: "“The beautiful thing about learning is that no one can take it away from you.” — B.B. King",
  },
  {
    icon: Atom,
    title: "Knowledge Alchemy",
    text: "Teaching concepts to another person is scientifically proven to be the fastest way to master them.",
  },
];

const CENTER_ICONS = [GraduationCap, Sparkles, BookOpen, Atom, Rocket, Brain];

interface FancifulLoaderProps {
  mode?: 'fullscreen' | 'inline';
  navigatingTo?: string | null;
  onDismiss?: () => void;
}

export function FancifulLoader({ mode = 'fullscreen', navigatingTo }: FancifulLoaderProps) {
  const [factIndex, setFactIndex] = useState(0);
  const [centerIconIndex, setCenterIconIndex] = useState(0);

  // Auto-cycle fun facts every 3.2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Cycle center floating icon every 1.8 seconds
  useEffect(() => {
    const iconTimer = setInterval(() => {
      setCenterIconIndex((prev) => (prev + 1) % CENTER_ICONS.length);
    }, 1800);
    return () => clearInterval(iconTimer);
  }, []);

  const currentFact = FUN_FACTS[factIndex];
  const CurrentCenterIcon = CENTER_ICONS[centerIconIndex];
  const FactIcon = currentFact.icon;

  const handleNextFact = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
  };

  const content = (
    <div className="relative flex flex-col items-center justify-center max-w-sm w-full mx-auto p-6 text-center select-none">
      {/* Decorative ambient background blur */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-indigo-500/15 to-purple-500/20 rounded-3xl blur-2xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col items-center overflow-hidden">
        
        {/* Top subtle glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Fanciful Multi-Ring Orbital Spinner Container */}
        <div className="relative w-32 h-32 flex items-center justify-center my-3">
          
          {/* Ring 1 - Outer Pulsing Dashed Orbit */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />

          {/* Ring 2 - Reverse Gradient Ring with Satellite */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-indigo-400/50 dark:border-indigo-500/40 border-t-transparent border-r-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            {/* Orbiting Satellite Dot */}
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />
          </motion.div>

          {/* Ring 3 - Fast Inner Shimmer Ring */}
          <motion.div
            className="absolute inset-5 rounded-full border-2 border-primary border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          >
            {/* Inner Satellite Star */}
            <span className="absolute -bottom-1 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
          </motion.div>

          {/* Glowing Center Core Sphere */}
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-indigo-500/20 to-purple-500/30 border border-primary/30 flex items-center justify-center shadow-inner relative overflow-hidden"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Radial glow */}
            <div className="absolute inset-0 bg-radial from-primary/30 via-transparent to-transparent pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={centerIconIndex}
                initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative z-10 text-primary"
              >
                <CurrentCenterIcon className="w-8 h-8 text-primary drop-shadow-[0_2px_8px_rgba(var(--primary-rgb),0.5)]" />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Dynamic Status / Destination Header */}
        <div className="mt-2 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.span>
            <span>{navigatingTo ? `Navigating to ${navigatingTo}...` : 'Brewing Knowledge...'}</span>
          </div>

          <p className="text-xs text-muted-foreground font-medium pt-1">
            Loading next campus module
          </p>
        </div>

        {/* Dancing Audio Equalizer / Pulse Bars */}
        <div className="flex items-center gap-1 my-3 h-5">
          {[0.1, 0.35, 0.2, 0.5, 0.3].map((delay, idx) => (
            <motion.span
              key={idx}
              className="w-1 bg-gradient-to-t from-primary to-indigo-400 rounded-full"
              animate={{ height: ['4px', '18px', '6px'] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
              }}
            />
          ))}
        </div>

        {/* Entertaining Rotating Fun Facts & Academic Quotes */}
        <div className="w-full bg-muted/60 dark:bg-muted/40 border border-border/80 rounded-xl p-3 min-h-[82px] flex flex-col justify-between relative mt-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={factIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2.5 text-left rtl:text-right"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                <FactIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground tracking-wide uppercase">
                  {currentFact.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {currentFact.text}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Interactive "Next Fact" click button to entertain the user */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/50 text-[10px]">
            <span className="text-muted-foreground/80 font-mono">
              Tip {factIndex + 1}/{FUN_FACTS.length}
            </span>
            <button
              type="button"
              onClick={handleNextFact}
              className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors py-0.5 px-1.5 rounded hover:bg-primary/10 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Tap for another</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (mode === 'inline') {
    return (
      <div className="flex items-center justify-center min-h-[420px] w-full py-12 px-4">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-background/60 backdrop-blur-md p-4"
    >
      {content}
    </motion.div>
  );
}
