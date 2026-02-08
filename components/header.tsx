"use client";

import { Brain, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { getTimeUntilReset } from "@/lib/time-utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setTimeLeft(getTimeUntilReset());

    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  return (
    <header className="w-full px-4 md:px-6 py-4 flex items-center justify-between border-b border-border/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Brain className="w-6 h-6 md:w-8 md:h-8 text-foreground" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
        </div>
        <span className="hidden md:inline text-lg md:text-xl font-semibold tracking-wider font-mono">
          Futurizzm
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-6">
        <button className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm">
          Live
        </button>
        <span className="text-muted-foreground/30">|</span>
        <button className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm">
          Model
        </button>
        <span className="text-muted-foreground/30">|</span>
        <button className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm">
          Info
        </button>
      </nav>

      <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop: Timer + Theme toggle (right side) */}
      <div className="hidden md:flex items-center gap-4">
        {/* Timer display (borderless) */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground font-mono tracking-wider">
            Next Forecasts In
          </span>
          <span className="text-sm font-mono font-bold tracking-wider">
            {mounted
              ? `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
              : "--:--:--"}
          </span>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-background border-b border-border/30 md:hidden z-50">
          <nav className="flex flex-col items-center p-4 gap-3">
            <button className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm py-2">
              Live
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm py-2">
              Model
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm py-2">
              Info
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
