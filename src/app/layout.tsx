import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { BudgetToaster } from "@/components/layout/budget-toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RouteIQ — LLM Observability Dashboard",
  description:
    "Real-time monitoring, cost tracking, and routing optimization for your LLM infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <TooltipProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <BudgetToaster />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
