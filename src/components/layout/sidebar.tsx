// drift-ignore-file — Next.js route paths are intentional config, not hardcoded URLs
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GitCompare,
  ScrollText,
  DollarSign,
  Zap,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  mock:       { label: "Mock data",   color: "bg-gray-500" },
  openrouter: { label: "OpenRouter",  color: "bg-blue-500" },
  litellm:    { label: "LiteLLM",     color: "bg-violet-500" },
};

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Models",
    href: "/models",
    icon: GitCompare,
  },
  {
    label: "Request Logs",
    href: "/logs",
    icon: ScrollText,
  },
  {
    label: "Cost & Budget",
    href: "/budget",
    icon: DollarSign,
  },
  {
    label: "Optimizer",
    href: "/optimizer",
    icon: Zap,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [dataSource, setDataSource] = useState<string>("mock");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setDataSource(d.dataSource ?? "mock"))
      .catch(() => {});
  }, []);

  const sourceInfo = SOURCE_LABELS[dataSource] ?? SOURCE_LABELS.mock;

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">RouteIQ</p>
          <p className="text-xs text-muted-foreground mt-0.5">LLM Observability</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
        <div className="mt-3 px-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sourceInfo.color} animate-pulse`} />
            <span className="text-xs text-muted-foreground">{sourceInfo.label} active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
