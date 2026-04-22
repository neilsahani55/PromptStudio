import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ColorThemeId, PresetColorTheme, CustomColorTheme } from "@/ai/prompt-schema";
import { cn } from "@/lib/utils";
import { Check, Palette, Settings2 } from "lucide-react";
import { AdvancedColorBuilder } from "@/components/advanced-color-builder";

interface ColorThemeSelectorProps {
  mode: ColorThemeId;
  onModeChange: (mode: ColorThemeId) => void;
  presetId?: PresetColorTheme;
  onPresetChange: (id: PresetColorTheme) => void;
  customDescription?: string;
  onCustomDescriptionChange: (desc: string) => void;
  customTheme?: CustomColorTheme;
  onCustomThemeChange?: (theme: CustomColorTheme) => void;
  className?: string;
}

const PRESETS: { id: PresetColorTheme; label: string; color: string }[] = [
  { id: 'light_neutral', label: 'Light Neutral', color: '#f3f4f6' },
  { id: 'dark_saas', label: 'Dark SaaS', color: '#1e293b' },
  { id: 'warm_organic', label: 'Warm & Organic', color: '#fef3c7' },
  { id: 'cyber_blue', label: 'Cyber Blue', color: '#06b6d4' },
  { id: 'pastel_playful', label: 'Pastel Playful', color: '#fbcfe8' },
  { id: 'high_contrast', label: 'High Contrast', color: '#000000' },
];

export function ColorThemeSelector({
  mode,
  onModeChange,
  presetId,
  onPresetChange,
  customDescription,
  onCustomDescriptionChange,
  customTheme,
  onCustomThemeChange,
  className
}: ColorThemeSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Color Theme
        </Label>
        <RadioGroup
          value={mode || 'auto'}
          onValueChange={(v) => onModeChange(v as ColorThemeId)}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div>
            <RadioGroupItem value="auto" id="theme_auto" className="peer sr-only" />
            <Label
              htmlFor="theme_auto"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full transition-all"
            >
              <span className="font-semibold text-sm">Auto (Recommended)</span>
              <span className="text-[10px] text-muted-foreground mt-1">Based on content/brand</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="preset" id="theme_preset" className="peer sr-only" />
            <Label
              htmlFor="theme_preset"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full transition-all"
            >
              <span className="font-semibold text-sm">Choose Preset</span>
              <span className="text-[10px] text-muted-foreground mt-1">Select from styles</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="custom" id="theme_custom" className="peer sr-only" />
            <Label
              htmlFor="theme_custom"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full transition-all"
            >
              <span className="font-semibold text-sm flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" />
                Custom Builder
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">Define precise palette</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {mode === 'preset' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border transition-all text-sm",
                presetId === p.id 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-input hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div 
                className="w-4 h-4 rounded-full border border-black/10 shadow-sm" 
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate font-medium">{p.label}</span>
              {presetId === p.id && <Check className="w-3 h-3 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}

      {mode === 'custom' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
           {/* New Builder */}
           {onCustomThemeChange && (
             <AdvancedColorBuilder 
               theme={customTheme || { stops: [] }}
               onChange={onCustomThemeChange}
             />
           )}
           
           {/* Legacy Text Input Fallback */}
           {!onCustomThemeChange && (
              <>
               <Textarea 
                 placeholder="e.g. deep navy background, teal accents, soft off-white cards"
                 value={customDescription || ''}
                 onChange={(e) => onCustomDescriptionChange(e.target.value)}
                 className="min-h-[80px]"
               />
               <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
                 Describe the colors you want to see. You can mention hex codes or color names.
               </p>
              </>
           )}
        </div>
      )}
    </div>
  );
}
