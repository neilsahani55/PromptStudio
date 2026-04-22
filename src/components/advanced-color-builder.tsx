import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Palette, Sparkles } from "lucide-react";
import { CustomColorTheme, CustomColorStop } from "@/ai/prompt-schema";

interface AdvancedColorBuilderProps {
  theme: CustomColorTheme;
  onChange: (theme: CustomColorTheme) => void;
}

const MOODS = [
  "Calm", "Playful", "Serious", "Premium", "Energetic", "Trustworthy", "Creative", "Bold"
];

const ROLES: { id: NonNullable<CustomColorStop['role']>; label: string }[] = [
  { id: 'background', label: 'Background' },
  { id: 'primary', label: 'Primary' },
  { id: 'accent', label: 'Accent' },
  { id: 'text', label: 'Text' },
  { id: 'neutral', label: 'Neutral' },
];

export function AdvancedColorBuilder({ theme, onChange }: AdvancedColorBuilderProps) {
  const [stops, setStops] = useState<CustomColorStop[]>(theme.stops || []);
  const [label, setLabel] = useState(theme.label || "");
  const [mainMood, setMainMood] = useState(theme.mainMood || "");

  // Sync internal state with props when props change (e.g. initial load)
  useEffect(() => {
    setStops(theme.stops || []);
    setLabel(theme.label || "");
    setMainMood(theme.mainMood || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.label, theme.mainMood, JSON.stringify(theme.stops)]);

  // Propagate changes to parent
  const updateTheme = (newStops: CustomColorStop[], newLabel: string, newMood: string) => {
    onChange({
      label: newLabel,
      mainMood: newMood,
      stops: newStops
    });
  };

  const addStop = () => {
    if (stops.length >= 6) return;
    const newStop: CustomColorStop = { hex: "#000000", name: "", role: "accent" };
    const newStops = [...stops, newStop];
    setStops(newStops);
    updateTheme(newStops, label, mainMood);
  };

  const removeStop = (index: number) => {
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
    updateTheme(newStops, label, mainMood);
  };

  const updateStop = (index: number, field: keyof CustomColorStop, value: string) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
    updateTheme(newStops, label, mainMood);
  };

  // Generate preview text
  const getPreviewText = () => {
    if (!stops.length) return "Start adding colors to see the preview...";
    
    const roleLabels: string[] = [];
    const plainLabels: string[] = [];

    stops.forEach(stop => {
      const name = stop.name || stop.hex || "color";
      const desc = stop.name && stop.hex ? `${stop.name} (${stop.hex})` : name;
      
      if (stop.role) {
        roleLabels.push(`${stop.role}: ${desc}`);
      } else {
        plainLabels.push(desc);
      }
    });

    const parts = [
      roleLabels.length ? `roles: ${roleLabels.join(', ')}` : '',
      plainLabels.length ? `accents: ${plainLabels.join(', ')}` : ''
    ].filter(Boolean).join('; ');

    return `We'll describe this as: ${parts}${mainMood ? `, in a ${mainMood} palette` : ''}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Palette Name (Optional)</Label>
          <Input 
            placeholder="e.g. My Brand Colors" 
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              updateTheme(stops, e.target.value, mainMood);
            }}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Mood Hint</Label>
          <Select 
            value={mainMood} 
            onValueChange={(val) => {
              setMainMood(val);
              updateTheme(stops, label, val);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select mood" />
            </SelectTrigger>
            <SelectContent>
              {MOODS.map(m => (
                <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground">Colors ({stops.length}/6)</Label>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-primary hover:text-primary/80 px-2"
            onClick={addStop}
            disabled={stops.length >= 6}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Color
          </Button>
        </div>

        <div className="space-y-2">
          {stops.map((stop, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-card/50 group">
              <div className="relative shrink-0">
                <Input 
                  type="color" 
                  value={stop.hex || "#000000"}
                  onChange={(e) => updateStop(idx, 'hex', e.target.value)}
                  className="w-8 h-8 p-0 border-none rounded cursor-pointer overflow-hidden"
                />
              </div>
              
              <Input 
                placeholder="Name (e.g. Deep Navy)" 
                value={stop.name || ""}
                onChange={(e) => updateStop(idx, 'name', e.target.value)}
                className="h-8 text-xs flex-1 min-w-[100px]"
              />

              <Select 
                value={stop.role || "accent"} 
                onValueChange={(val) => updateStop(idx, 'role', val)}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeStop(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          {stops.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed rounded-md text-muted-foreground text-sm">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No colors added yet.</p>
              <Button type="button" variant="link" size="sm" onClick={addStop}>Add your first color</Button>
            </div>
          )}
        </div>
      </div>

      {stops.length > 0 && (
        <div className="bg-muted/30 p-3 rounded-md border border-border/50 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="font-semibold">Prompt Preview</span>
          </div>
          <p className="italic text-muted-foreground/80 leading-relaxed">
            "{getPreviewText()}"
          </p>
        </div>
      )}
    </div>
  );
}
