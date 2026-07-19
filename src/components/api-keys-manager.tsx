"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, Loader2, Trash2, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface SavedKey {
  provider: string;
  masked: string;
  base_url: string | null;
  model: string | null;
  created_at: string;
}

const PROVIDER_META: Record<string, { label: string; keyHint: string; needsBaseUrl?: boolean; baseUrlHint?: string; modelHint?: string; usedFor: string }> = {
  huggingface: { label: "Hugging Face", keyHint: "hf_… token (huggingface.co/settings/tokens, Inference preset)", usedFor: "Image + video generation on your own HF quota" },
  nvidia: { label: "NVIDIA", keyHint: "nvapi-… key (build.nvidia.com)", usedFor: "FLUX image generation on your own NVIDIA quota" },
  gemini: { label: "Google Gemini", keyHint: "AIza… key (aistudio.google.com/apikey)", modelHint: "default: gemini-2.5-flash", usedFor: "Prompt Enhance + video-prompt adaptation" },
  openai: { label: "OpenAI", keyHint: "sk-… key (platform.openai.com)", modelHint: "default: gpt-4o-mini", usedFor: "Prompt Enhance + video-prompt adaptation" },
  deepseek: { label: "DeepSeek", keyHint: "sk-… key (platform.deepseek.com)", modelHint: "default: deepseek-chat", usedFor: "Prompt Enhance + video-prompt adaptation" },
  ollama: { label: "Ollama", keyHint: "any value (Ollama has no key)", needsBaseUrl: true, baseUrlHint: "publicly reachable server, e.g. https://my-ollama.example.com", modelHint: "e.g. llama3.1", usedFor: "Prompt Enhance via your own Ollama server" },
  custom: { label: "Custom (OpenAI-compatible)", keyHint: "API key for your endpoint", needsBaseUrl: true, baseUrlHint: "e.g. https://api.example.com/v1", modelHint: "model id on that endpoint", usedFor: "Prompt Enhance via any OpenAI-compatible API" },
};

export function ApiKeysManager() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState("huggingface");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user-keys", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setProviders(data.providers || Object.keys(PROVIDER_META));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const meta = PROVIDER_META[provider] || PROVIDER_META.custom;

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({ variant: "destructive", title: "Enter the API key first" });
      return;
    }
    if (meta.needsBaseUrl && !baseUrl.trim()) {
      toast({ variant: "destructive", title: "This provider needs a Base URL" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), baseUrl: baseUrl.trim(), model: model.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Key verified & saved ✓", description: data.detail });
        setApiKey(""); setBaseUrl(""); setModel("");
        load();
      } else {
        toast({ variant: "destructive", title: data.error || "Save failed", description: data.detail });
      }
    } catch {
      toast({ variant: "destructive", title: "Save failed", description: "Network error — try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: string) => {
    await fetch(`/api/user-keys?provider=${encodeURIComponent(p)}`, { method: "DELETE", credentials: "same-origin" });
    toast({ title: `${PROVIDER_META[p]?.label || p} key removed` });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="w-5 h-5 text-primary" />
          Your API Keys
        </CardTitle>
        <CardDescription>
          Bring your own keys to generate on your own quota. Every key is verified against the
          provider before saving, and stored encrypted. Hugging Face / NVIDIA keys power image &amp;
          video generation; LLM keys (Gemini, OpenAI, DeepSeek, Ollama, custom) power Prompt
          Enhance and video-prompt adaptation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Saved keys */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : keys.length > 0 ? (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.provider} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    {PROVIDER_META[k.provider]?.label || k.provider}
                    <span className="font-code text-xs text-muted-foreground">{k.masked}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {PROVIDER_META[k.provider]?.usedFor}
                    {k.model ? ` · model: ${k.model}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(k.provider)} title="Remove key">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No keys saved yet — add one below.</p>
        )}

        {/* Add / update */}
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add or update a key</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(providers.length ? providers : Object.keys(PROVIDER_META)).map((p) => (
                    <SelectItem key={p} value={p}>{PROVIDER_META[p]?.label || p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{meta.usedFor}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">API key</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={meta.keyHint} className="bg-background" />
            </div>
            {(meta.needsBaseUrl || provider === "custom" || provider === "ollama") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Base URL</Label>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={meta.baseUrlHint || "https://…"} className="bg-background" />
              </div>
            )}
            {meta.modelHint && (
              <div className="space-y-1.5">
                <Label className="text-xs">Model (optional)</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={meta.modelHint} className="bg-background" />
              </div>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Verifying key…" : "Verify & save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
