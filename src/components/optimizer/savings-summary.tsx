import { DollarSign, TrendingDown, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost } from "@/lib/utils/formatting";
import type { RoutingSuggestion } from "@/types";

interface Props {
  suggestions: RoutingSuggestion[];
  totalSavings: number;
}

export function SavingsSummary({ suggestions, totalSavings }: Props) {
  const annualSavings = totalSavings * 12;
  const avgSavingsPct =
    suggestions.length > 0
      ? suggestions.reduce((s, r) => s + r.estimatedSavingsPct, 0) / suggestions.length
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Est. Monthly Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-500">{formatCost(totalSavings)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">across all suggestions</p>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            Projected Annual Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-blue-400">{formatCost(annualSavings)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">if optimizations applied</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Opportunities Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{suggestions.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            avg {avgSavingsPct.toFixed(0)}% cost reduction
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
