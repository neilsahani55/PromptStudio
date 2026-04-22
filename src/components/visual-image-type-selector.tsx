import React from 'react';
import {
  User,
  BarChart3,
  Smartphone,
  Image as ImageIcon,
  Hexagon,
  Box,
  Sticker,
  PieChart,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageType } from '@/ai/prompt-schema';

interface VisualImageTypeSelectorProps {
  value: ImageType;
  onChange: (value: ImageType) => void;
}

const IMAGE_TYPES: { id: ImageType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'scene_illustration',
    label: 'Scene',
    description: 'Full scene with environment',
    icon: <ImageIcon className="w-5 h-5" />
  },
  {
    id: 'ui_mockup',
    label: 'UI Mockup',
    description: 'Screens & dashboards',
    icon: <Smartphone className="w-5 h-5" />
  },
  {
    id: 'infographic',
    label: 'Infographic',
    description: 'Data visuals & charts',
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    id: 'character',
    label: 'Character',
    description: 'Person or mascot',
    icon: <User className="w-5 h-5" />
  },
  {
    id: 'abstract_visual',
    label: 'Abstract',
    description: 'Shapes & metaphors',
    icon: <Hexagon className="w-5 h-5" />
  },
  {
    id: 'product_render',
    label: 'Product',
    description: 'Studio product shot',
    icon: <Box className="w-5 h-5" />
  },
  {
    id: 'icon_or_sticker',
    label: 'Icon / Sticker',
    description: 'Simple graphic element',
    icon: <Sticker className="w-5 h-5" />
  },
  {
    id: 'data_viz',
    label: 'Data Viz',
    description: 'Charts & graphs',
    icon: <PieChart className="w-5 h-5" />
  },
];

export function VisualImageTypeSelector({ value, onChange }: VisualImageTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {IMAGE_TYPES.map((type) => {
        const isSelected = value === type.id;
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={cn(
              "relative flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              isSelected
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-border/50 bg-card hover:bg-muted/40 hover:border-border"
            )}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5">
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "p-2 rounded-lg mb-2 transition-all",
              isSelected ? "bg-primary text-white shadow-sm" : "bg-muted/60 text-muted-foreground"
            )}>
              {type.icon}
            </div>
            <span className={cn("text-xs font-semibold leading-none mb-0.5", isSelected ? "text-primary" : "text-foreground")}>
              {type.label}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {type.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
