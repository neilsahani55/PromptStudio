import React from 'react';
import {
  Newspaper,
  Share2,
  BarChart,
  User,
  Smartphone,
  Hexagon,
  ArrowRight
} from 'lucide-react';
import { ImageType } from '@/ai/prompt-schema';
import { BrandStyle } from '@/ai/utils/style-profiles';
import { PromptIntent } from '@/ai/utils/intent-patterns';

export interface WizardPreset {
  label: string;
  description: string;
  icon: React.ReactNode;
  imageType: ImageType;
  intent: PromptIntent;
  style: BrandStyle;
  hint: string;
  gradient: string;
}

const WIZARD_OPTIONS: WizardPreset[] = [
  {
    label: "Blog Hero Image",
    description: "Header image for your article",
    icon: <Newspaper className="w-5 h-5" />,
    imageType: 'scene_illustration',
    intent: 'blog_hero',
    style: 'minimalBlog',
    hint: "Room for your title on the left.",
    gradient: "from-amber-500/10 to-orange-600/5",
  },
  {
    label: "Social Media Post",
    description: "Engaging visual for feed",
    icon: <Share2 className="w-5 h-5" />,
    imageType: 'scene_illustration',
    intent: 'social_story',
    style: 'modernSaaS',
    hint: "Optimized for vertical scrolling.",
    gradient: "from-pink-500/10 to-rose-600/5",
  },
  {
    label: "Infographic",
    description: "Explain data visually",
    icon: <BarChart className="w-5 h-5" />,
    imageType: 'infographic',
    intent: 'feature_highlight',
    style: 'modernSaaS',
    hint: "Clarity, charts, and readable labels.",
    gradient: "from-emerald-500/10 to-green-600/5",
  },
  {
    label: "Character / Mascot",
    description: "Brand personality",
    icon: <User className="w-5 h-5" />,
    imageType: 'character',
    intent: 'general',
    style: 'none',
    hint: "Avatars or brand mascots.",
    gradient: "from-orange-500/10 to-amber-600/5",
  },
  {
    label: "App / Dashboard UI",
    description: "Mockup of software",
    icon: <Smartphone className="w-5 h-5" />,
    imageType: 'ui_mockup',
    intent: 'feature_highlight',
    style: 'modernSaaS',
    hint: "Clean, modern interface design.",
    gradient: "from-stone-500/10 to-stone-600/5",
  },
  {
    label: "Abstract Concept",
    description: "Metaphorical visuals",
    icon: <Hexagon className="w-5 h-5" />,
    imageType: 'abstract_visual',
    intent: 'blog_hero',
    style: 'modernSaaS',
    hint: "Shapes and colors for ideas.",
    gradient: "from-cyan-500/10 to-teal-600/5",
  }
];

interface WizardSelectorProps {
  onSelect: (preset: WizardPreset) => void;
}

export function WizardSelector({ onSelect }: WizardSelectorProps) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">What are you creating?</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick a starting point to auto-configure settings.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {WIZARD_OPTIONS.map((option, idx) => (
          <button
            key={idx}
            type="button"
            className={`group relative flex flex-col items-center text-center p-4 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden`}
            onClick={() => onSelect(option)}
          >
            <div className={`absolute inset-0 bg-gradient-to-b ${option.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative z-10 flex flex-col items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary text-muted-foreground transition-all">
                {option.icon}
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight block">
                  {option.label}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block leading-tight">
                  {option.description}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
