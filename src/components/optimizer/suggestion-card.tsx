import { ArrowRight, TrendingDown, Lightbulb, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/utils/formatting";
import type { RoutingSuggestion } from "@/types";

const QUALITY_CONFIG = {
  none: {
    label: "No quality impact",
    color: "text-green-500",
    bg: "bg-green-500/10",
    icon: TrendingDown,
  },
  minimal: {
    label: "Minimal quality impact",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    icon: AlertTriangle,
  },
  moderate: {
    label: "Moderate quality impact",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    icon: AlertTriangle,
  },
} as const;

interface Props {
  suggestion: RoutingSuggestion;
}

export function SuggestionCard({ suggestion: s }: Props) {
  const qConfig = QUALITY_CONFIG[s.qualityImpact];
  const QIcon = qConfig.icon;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: model swap + reason */}
          <div className="flex-1 space-y-2">
            {/* Model route */}
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                {s.currentModel}
              </code>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                {s.suggestedModel}
              </code>
              <Badge variant="outline" className="text-xs">
                {s.taskType}
              </Badge>
            </div>

            {/* Reason */}
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{s.reason}</p>
            </div>

            {/* Quality badge */}
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${qConfig.bg} ${qConfig.color}`}
            >
              <QIcon className="w-3 h-3" />
              {qConfig.label}
            </div>
          </div>

          {/* Right: savings */}
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-green-500">
              {formatCost(s.estimatedSavingsUsd)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">est. monthly savings</p>
            <p className="text-sm font-semibold text-green-400 mt-1">
              -{s.estimatedSavingsPct}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
