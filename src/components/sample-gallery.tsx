import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ImageType } from '@/ai/prompt-schema';
import { BrandStyle } from '@/ai/utils/style-profiles';

interface Sample {
  id: string;
  label: string;
  text: string;
  imageType: ImageType;
  style: BrandStyle;
}

const SAMPLES: Sample[] = [
  {
    id: 'remote-work',
    label: 'Remote Work Blog Hero',
    text: "A modern home office setup with natural light, ergonomic chair, and lush plants, representing the freedom and comfort of remote work for a tech blog header.",
    imageType: 'scene_illustration',
    style: 'minimalBlog'
  },
  {
    id: 'saas-dashboard',
    label: 'SaaS Dashboard Redesign',
    text: "A high-fidelity dark mode analytics dashboard showing real-time data visualization, user growth charts, and a clean sidebar navigation.",
    imageType: 'ui_mockup',
    style: 'modernSaaS'
  },
  {
    id: 'product-launch',
    label: 'Product Launch LinkedIn',
    text: "A sleek, professional product shot of a new smart coffee mug on a marble countertop, with steam rising and soft morning lighting.",
    imageType: 'product_render',
    style: 'ecomPremium'
  }
];

interface SampleGalleryProps {
  onSelect: (sample: Sample) => void;
}

export function SampleGallery({ onSelect }: SampleGalleryProps) {
  return (
    <div className="w-full mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-4 mb-5">
        <div className="h-px bg-border/60 flex-1" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-xs font-semibold uppercase tracking-wider">Try an example</span>
        </div>
        <div className="h-px bg-border/60 flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="group text-left p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
            onClick={() => onSelect(sample)}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {sample.label}
              </span>
              <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                {sample.imageType.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
              {sample.text}
            </p>
            <div className="flex items-center gap-1 text-primary text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Try this <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
