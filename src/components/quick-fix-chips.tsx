import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FixType =
  | 'less_busy'
  | 'more_minimal'
  | 'more_colorful'
  | 'more_realistic'
  | 'more_stylized';

interface QuickFixChipsProps {
  onFix: (fix: FixType) => void;
  isLoading?: boolean;
}

const FIXES: { id: FixType; label: string }[] = [
  { id: 'less_busy', label: 'Less busy' },
  { id: 'more_minimal', label: 'Minimal' },
  { id: 'more_colorful', label: 'Colorful' },
  { id: 'more_realistic', label: 'Realistic' },
  { id: 'more_stylized', label: 'Stylized' },
];

export function QuickFixChips({ onFix, isLoading }: QuickFixChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-1.5 mr-1 text-xs text-muted-foreground font-medium">
        <Sparkles className="w-3.5 h-3.5 text-primary/60" />
        <span>Quick fix:</span>
      </div>
      {FIXES.map((fix) => (
        <Button
          key={fix.id}
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => onFix(fix.id)}
          className="h-7 text-xs rounded-full border-border/60 bg-card hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
        >
          {fix.label}
        </Button>
      ))}
    </div>
  );
}
