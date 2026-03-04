import { CheckCircle2, XCircle, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EnvVar {
  name: string;
  value: string;
  description: string;
}

interface Props {
  name: string;
  description: string;
  docsUrl: string;
  docsLabel: string;
  isActive: boolean;
  hasKey: boolean;
  badge?: string;
  envVars: EnvVar[];
  features: string[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function ConnectionCard({
  name,
  description,
  docsUrl,
  docsLabel,
  isActive,
  hasKey,
  badge,
  envVars,
  features,
}: Props) {
  return (
    <Card className={isActive ? "border-primary/40 bg-primary/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {name}
              {isActive && (
                <Badge className="bg-primary/20 text-primary border-primary/30 border text-xs" variant="outline">
                  Active
                </Badge>
              )}
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-sm">
            {hasKey ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-500 text-xs">Key set</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">No key</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Features */}
        <div className="flex flex-wrap gap-1.5">
          {features.map((f) => (
            <Badge key={f} variant="secondary" className="text-xs">
              {f}
            </Badge>
          ))}
        </div>

        {/* Env vars snippet */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">.env.local configuration:</p>
          <div className="bg-muted rounded-md p-3 space-y-1 font-mono text-xs">
            {envVars.map((v) => (
              <div key={v.name} className="flex items-center gap-1">
                <span className="text-blue-400">{v.name}</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-green-400">{v.value}</span>
                <CopyButton text={`${v.name}=${v.value}`} />
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" size="sm" asChild>
          <a href={docsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            {docsLabel}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
