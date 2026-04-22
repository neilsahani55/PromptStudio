"use client";

import { useEffect, useState } from "react";
import { Loader2, Brain, Palette, Wand2, CheckCircle2 } from "lucide-react";

export type GenerationStage =
  | 'analyzing'
  | 'generating_components'
  | 'formatting'
  | 'scoring'
  | 'complete';

interface GenerationProgressProps {
  stage: GenerationStage;
  elapsed: number; // ms
}

const STAGES: { id: GenerationStage; label: string; icon: React.ElementType; tip: string }[] = [
  { id: 'analyzing', label: 'Analyzing content', icon: Brain, tip: 'Reading your text and identifying key themes...' },
  { id: 'generating_components', label: 'Generating components', icon: Wand2, tip: 'Crafting visual elements, lighting, and composition...' },
  { id: 'formatting', label: 'Formatting prompts', icon: Palette, tip: 'Optimizing for Midjourney, DALL-E, SD, and Flux...' },
  { id: 'scoring', label: 'Scoring quality', icon: CheckCircle2, tip: 'Evaluating prompt quality and generating variants...' },
];

export function GenerationProgress({ stage, elapsed }: GenerationProgressProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = STAGES.findIndex(s => s.id === stage);

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center p-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="pulse-glow rounded-full">
        <div className="p-4 bg-gradient-to-br from-primary to-accent rounded-full shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>

      {/* Stage Progress */}
      <div className="w-full max-w-sm space-y-3">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isPending = i > currentIndex;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 border border-primary/20 text-foreground'
                  : isDone
                  ? 'text-muted-foreground/70'
                  : 'text-muted-foreground/40'
              }`}
            >
              <div className={`flex-shrink-0 ${isActive ? 'text-primary' : isDone ? 'text-green-500' : ''}`}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                {s.label}{isActive ? dots : isDone ? '' : ''}
              </span>
              {isDone && (
                <span className="text-[10px] text-green-500 ml-auto">done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current tip */}
      {currentIndex >= 0 && currentIndex < STAGES.length && (
        <p className="text-xs text-muted-foreground max-w-sm animate-in fade-in duration-300">
          {STAGES[currentIndex].tip}
        </p>
      )}

      {/* Timer */}
      <span className="text-xs text-muted-foreground/60 tabular-nums">
        {(elapsed / 1000).toFixed(0)}s elapsed
      </span>
    </div>
  );
}
