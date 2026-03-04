"use client";

import { useState } from "react";
import {
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProviderConfig, type ProviderConfig, type ProviderType } from "@/hooks/use-provider-config";

// ── Provider metadata ─────────────────────────────────────────

const PROVIDERS: {
  value: ProviderType;
  label: string;
  description: string;
  docsUrl: string;
  keyPlaceholder: string;
  keyLabel: string;
  color: string;
}[] = [
  {
    value: "mock",
    label: "Mock Data",
    description: "Deterministic synthetic data — no API key required. Perfect for demos.",
    docsUrl: "#",
    keyPlaceholder: "",
    keyLabel: "",
    color: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    description: "Connect your OpenRouter account to see real LLM usage, costs, and model analytics.",
    docsUrl: "https://openrouter.ai/settings/keys",
    keyPlaceholder: "sk-or-v1-...",
    keyLabel: "OpenRouter API Key",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    value: "litellm",
    label: "LiteLLM",
    description: "Connect a self-hosted LiteLLM proxy for full per-request observability.",
    docsUrl: "https://docs.litellm.ai/docs/proxy/quick_start",
    keyPlaceholder: "sk-...",
    keyLabel: "LiteLLM Master Key",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
];

// ── Test connection ───────────────────────────────────────────

interface TestResult {
  ok: boolean;
  message: string;
}

async function testConnection(cfg: ProviderConfig): Promise<TestResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.provider !== "mock" && cfg.apiKey) {
      headers["x-provider"] = cfg.provider;
      headers["x-api-key"] = cfg.apiKey;
    }
    if (cfg.provider === "litellm" && cfg.litellmBaseUrl) {
      headers["x-litellm-base-url"] = cfg.litellmBaseUrl;
    }

    const res = await fetch("/api/config", { headers });
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };

    const data = await res.json() as { connected: boolean; error: string | null };
    if (data.connected) return { ok: true, message: "Connection successful!" };
    return { ok: false, message: data.error ?? "Could not connect" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Network error" };
  }
}

// ── Main component ────────────────────────────────────────────

export function RuntimeProviderConfig() {
  const { config, save, loaded } = useProviderConfig();
  const [draft, setDraft] = useState<ProviderConfig | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saved, setSaved] = useState(false);

  // Use draft if editing, else the saved config
  const current = draft ?? (loaded ? config : null);
  if (!current) return <div className="h-32 bg-muted animate-pulse rounded-lg" />;

  const selectedProvider = PROVIDERS.find((p) => p.value === current.provider) ?? PROVIDERS[0];
  const isDirty = draft !== null;

  function update(patch: Partial<ProviderConfig>) {
    setDraft((prev) => ({ ...(prev ?? current), ...patch } as ProviderConfig));
    setTestResult(null);
    setSaved(false);
  }

  async function handleTest() {
    if (!current) return;
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(current);
    setTestResult(result);
    setTesting(false);
  }

  function handleSave() {
    if (!current) return;
    save(current);
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Reload page to apply new provider across all hooks
    setTimeout(() => window.location.reload(), 300);
  }

  return (
    <Card className={isDirty ? "border-amber-500/30" : ""}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Live Data Source
              {isDirty && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                  Unsaved changes
                </Badge>
              )}
              {saved && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Saved ✓
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure your data source here — no .env.local edits, no restarts.
              Settings are saved in your browser.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${selectedProvider.color}`}
          >
            {selectedProvider.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Provider</Label>
          <Select
            value={current.provider}
            onValueChange={(v) => update({ provider: v as ProviderType, apiKey: "" })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{p.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
        </div>

        {/* API Key — only show for non-mock providers */}
        {current.provider !== "mock" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">{selectedProvider.keyLabel}</Label>
              {selectedProvider.docsUrl !== "#" && (
                <a
                  href={selectedProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={current.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder={selectedProvider.keyPlaceholder}
                className="h-9 text-sm font-mono pr-9"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* LiteLLM Base URL */}
        {current.provider === "litellm" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Proxy Base URL</Label>
            <Input
              type="text"
              value={current.litellmBaseUrl}
              onChange={(e) => update({ litellmBaseUrl: e.target.value })}
              placeholder="http://localhost:4000"
              className="h-9 text-sm font-mono"
            />
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <Alert variant={testResult.ok ? "default" : "destructive"} className="py-2">
            <AlertDescription className="text-xs flex items-center gap-1.5">
              {testResult.ok && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || (current.provider !== "mock" && !current.apiKey)}
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 mr-1.5" />
            )}
            Test connection
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty && !saved}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save & Apply
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Keys are stored only in your browser&apos;s localStorage — never sent to any server except your configured provider.
        </p>
      </CardContent>
    </Card>
  );
}
