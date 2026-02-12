"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { getTimeUntilReset } from "@/lib/time-utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setTimeLeft(getTimeUntilReset());

    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close menu on outside click/touch
  useEffect(() => {
    if (!menuOpen) return;

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [menuOpen]);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  return (
    <header className="relative w-full px-4 md:px-6 py-4 flex items-center justify-between border-b border-border/30">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 md:w-12 md:h-12 animate-logo">
          <Image
            src="/prediction.svg"
            alt="Futurizzm Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="hidden md:inline text-xl md:text-2xl font-bold tracking-tight text-white font-mono">
          Futurizzm
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
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

      <button
        ref={menuButtonRef}
        className="md:hidden p-2"
        onClick={() => setMenuOpen(!menuOpen)}
      >
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
        <div
          ref={menuRef}
          className="absolute top-14 left-0 right-0 bg-background border-b border-border/30 md:hidden z-50"
        >
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
