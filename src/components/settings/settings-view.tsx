"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Database,
  Key,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ConnectionCard } from "./connection-card";

interface ConfigStatus {
  dataSource: "mock" | "openrouter" | "litellm";
  connected: boolean;
  error: string | null;
  hasOpenRouterKey: boolean;
  hasLiteLLMKey: boolean;
  litellmBaseUrl: string;
}

const DATA_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  mock:       { label: "Mock Data",   color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  openrouter: { label: "OpenRouter",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  litellm:    { label: "LiteLLM",     color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};

export function SettingsView() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function fetchStatus() {
    setChecking(true);
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const sourceConfig = status ? DATA_SOURCE_LABELS[status.dataSource] : null;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your data source and API connections.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={checking}>
          <RefreshCw className={`w-4 h-4 mr-2 ${checking ? "animate-spin" : ""}`} />
          Re-check
        </Button>
      </div>

      {/* Active data source */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Active Data Source
          </CardTitle>
          <CardDescription>
            Controlled by the <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_DATA_SOURCE</code> environment variable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {sourceConfig && (
              <Badge className={`${sourceConfig.color} border`} variant="outline">
                {sourceConfig.label}
              </Badge>
            )}
            {status && (
              <span className="flex items-center gap-1.5 text-sm">
                {status.connected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive">Not connected</span>
                  </>
                )}
              </span>
            )}
          </div>

          {status?.error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs font-mono">{status.error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              To switch data sources, update <code className="bg-muted px-1 rounded">NEXT_PUBLIC_DATA_SOURCE</code> in your{" "}
              <code className="bg-muted px-1 rounded">.env.local</code> file and restart the dev server.
              Valid values: <code className="bg-muted px-1 rounded">mock</code>,{" "}
              <code className="bg-muted px-1 rounded">openrouter</code>,{" "}
              <code className="bg-muted px-1 rounded">litellm</code>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Separator />

      {/* Connection cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Key className="w-4 h-4" />
          API Connections
        </h2>

        <ConnectionCard
          name="OpenRouter"
          description="Connect to OpenRouter for real LLM usage data and cost tracking."
          docsUrl="https://openrouter.ai/settings/keys"
          docsLabel="Get API Key"
          isActive={status?.dataSource === "openrouter"}
          hasKey={status?.hasOpenRouterKey ?? false}
          envVars={[
            {
              name: "NEXT_PUBLIC_DATA_SOURCE",
              value: "openrouter",
              description: "Switch to OpenRouter adapter",
            },
            {
              name: "OPENROUTER_API_KEY",
              value: "sk-or-v1-...",
              description: "Your OpenRouter API key",
            },
          ]}
          features={[
            "Real-time cost tracking",
            "Model usage analytics",
            "Credits balance monitoring",
            "Day-level activity aggregates",
          ]}
        />

        <ConnectionCard
          name="LiteLLM"
          description="Connect to a self-hosted LiteLLM proxy for full request-level observability."
          docsUrl="https://docs.litellm.ai/docs/proxy/quick_start"
          docsLabel="LiteLLM Docs"
          isActive={status?.dataSource === "litellm"}
          hasKey={status?.hasLiteLLMKey ?? false}
          badge="Coming Soon"
          envVars={[
            {
              name: "NEXT_PUBLIC_DATA_SOURCE",
              value: "litellm",
              description: "Switch to LiteLLM adapter",
            },
            {
              name: "LITELLM_BASE_URL",
              value: "http://localhost:4000",
              description: "Your LiteLLM proxy URL",
            },
            {
              name: "LITELLM_MASTER_KEY",
              value: "sk-...",
              description: "LiteLLM master key",
            },
          ]}
          features={[
            "Per-request log streaming",
            "Full latency & error tracking",
            "Team & key management",
            "Custom model routing rules",
          ]}
        />
      </div>

      <Separator />

      {/* How it works */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">How RouteIQ connects to your data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            RouteIQ uses an <strong className="text-foreground">Adapter Pattern</strong> — every data source
            implements the same <code className="bg-muted px-1 rounded text-xs">IDataAdapter</code> interface.
            The dashboard never knows where data comes from.
          </p>
          <p>
            This means you can switch from mock → OpenRouter → LiteLLM without touching
            a single component. Just change the env var and restart.
          </p>
          <a
            href="https://github.com"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1"
          >
            View source on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
