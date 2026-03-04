"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GitCompare,
  ScrollText,
  DollarSign,
  Zap,
  Settings,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMMANDS = [
  {
    label: "Overview",
    description: "KPI cards, charts, traffic summary",
    href: "/",
    icon: LayoutDashboard,
    keywords: ["overview", "dashboard", "home", "kpi"],
  },
  {
    label: "Models",
    description: "Compare models by cost, latency, health score",
    href: "/models",
    icon: GitCompare,
    keywords: ["models", "compare", "latency", "health", "score"],
  },
  {
    label: "Request Logs",
    description: "Full history of every LLM call",
    href: "/logs",
    icon: ScrollText,
    keywords: ["logs", "requests", "history", "export", "csv"],
  },
  {
    label: "Cost & Budget",
    description: "Track spend and forecast burn rate",
    href: "/budget",
    icon: DollarSign,
    keywords: ["budget", "cost", "spend", "forecast", "billing"],
  },
  {
    label: "Routing Optimizer",
    description: "AI-powered cost reduction suggestions",
    href: "/optimizer",
    icon: Zap,
    keywords: ["optimizer", "routing", "savings", "ai", "suggestions"],
  },
  {
    label: "Settings",
    description: "Configure data source and API keys",
    href: "/settings",
    icon: Settings,
    keywords: ["settings", "config", "api", "keys", "openrouter", "litellm"],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.includes(q))
        );
      })
    : COMMANDS;

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
      setQuery("");
    },
    [router]
  );

  // Keyboard navigation inside the list
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[activeIdx]) {
        navigate(filtered[activeIdx].href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIdx, navigate]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      {/* Panel */}
      <div
        className="w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Navigate to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul className="py-1 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((cmd, i) => (
              <li key={cmd.href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === activeIdx
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent"
                  )}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => navigate(cmd.href)}
                >
                  <cmd.icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      i === activeIdx ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{cmd.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {cmd.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    {cmd.href === "/" ? "/" : cmd.href}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-border rounded px-1">ESC</kbd> close
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="border border-border rounded px-1">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
