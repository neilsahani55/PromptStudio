import React, { useEffect, useState } from 'react';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputHelpersProps {
  currentLength: number;
  minLength?: number;
}

const TIPS = [
  "Mention who this is for (e.g. startup founders, parents).",
  "Add where the image will be used (blog header, LinkedIn post, ad banner).",
  "Write at least 1-2 sentences, not just keywords.",
  "Describe the lighting or mood you want (e.g., 'soft morning light').",
  "Specify if you want text space on the left or right."
];

export function InputHelpers({ currentLength, minLength = 50 }: InputHelpersProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const isGoodLength = currentLength >= 80;
  const isMinLength = currentLength >= minLength;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2.5 px-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="p-1 rounded bg-amber-500/10">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {TIPS[tipIndex]}
        </p>
      </div>

      <div className={cn(
        "flex items-center gap-1.5 font-mono text-[11px] transition-colors duration-300 shrink-0",
        isGoodLength ? "text-green-600 font-medium" : isMinLength ? "text-amber-600" : "text-muted-foreground/60"
      )}>
        {isGoodLength && <CheckCircle2 className="w-3 h-3" />}
        <span>{currentLength}</span>
        <span className="opacity-50">/ 80+ ideal</span>
      </div>
    </div>
  );
}
