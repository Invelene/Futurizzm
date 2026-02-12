"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Heart, Share2, Copy, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Prediction {
  title: string;
  chance: number; // 0-100 percentage
  chanceColor: string; // '#ef4444' (red) or '#22c55e' (green)
  content: string;
}

export interface PredictionCardProps {
  id?: string; // Database ID for likes
  category: string;
  categoryColor: string;
  model: string;
  modelVersion: string;
  predictions: Prediction[];
  likesCount: number;
  date?: string;
  isSelected?: boolean;
  isLoading?: boolean;
  onSwipe?: (
    direction: "left" | "right" | "up" | "down",
    velocity: number,
  ) => void;
}

const modelIcons: Record<string, React.ReactNode> = {
  GROK: (
    <div className="relative w-full h-full">
      <Image src="/Grok.svg" alt="Grok" fill className="object-contain" />
    </div>
  ),
  CLAUDE: (
    <div className="relative w-full h-full">
      <Image src="/Claude.svg" alt="Claude" fill className="object-contain" />
    </div>
  ),
  GPT: (
    <div className="relative w-full h-full">
      <Image src="/ChatGPT.svg" alt="GPT" fill className="object-contain" />
    </div>
  ),
  GEMINI: (
    <div className="relative w-full h-full">
      <Image src="/Gemini.svg" alt="Gemini" fill className="object-contain" />
    </div>
  ),
};

export function PredictionCard({
  id,
  category,
  categoryColor,
  model,
  modelVersion,
  predictions,
  likesCount,
  date = "jan 31",
  isSelected = false,
  isLoading = false,
  onSwipe,
}: PredictionCardProps) {
  const [liked, setLiked] = useState(false);
  const [displayLikes, setDisplayLikes] = useState(likesCount);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  // Touch handlers for mobile velocity scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (onSwipe) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !onSwipe) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = Math.max(Date.now() - touchStart.time, 1);
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    const minSwipeDistance = 30;
    const minVelocity = 0.2;

    // Determine if horizontal or vertical swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance && velocityX > minVelocity) {
        e.preventDefault();
        e.stopPropagation();
        onSwipe(deltaX > 0 ? "left" : "right", velocityX);
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance && velocityY > minVelocity) {
        e.preventDefault();
        e.stopPropagation();
        onSwipe(deltaY > 0 ? "up" : "down", velocityY);
      }
    }

    setTouchStart(null);
  };

  // Check localStorage for like status
  useEffect(() => {
    if (id) {
      const likeKey = `liked_${id}`;
      setLiked(localStorage.getItem(likeKey) === "true");
    }
  }, [id]);

  // Update display likes when prop changes
  useEffect(() => {
    setDisplayLikes(likesCount);
  }, [likesCount]);

  // Close share menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node)
      ) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLike = async () => {
    if (!id) return;

    const newLiked = !liked;
    const likeKey = `liked_${id}`;

    // Optimistic update
    setLiked(newLiked);
    setDisplayLikes((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    localStorage.setItem(likeKey, String(newLiked));

    // Send to API
    try {
      await fetch("/api/predictions/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictionId: id,
          action: newLiked ? "like" : "unlike",
        }),
      });
    } catch (error) {
      // Revert on error
      setLiked(!newLiked);
      setDisplayLikes((prev) => (newLiked ? prev - 1 : prev + 1));
      localStorage.setItem(likeKey, String(!newLiked));
    }
  };

  const formatLikes = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  // Generate share text
  const getShareText = () => {
    const predictionsText = predictions
      .map((p) => `✦ ${p.title} - ${p.chance}% chance\n${p.content}`)
      .join("\n\n");

    return `🔮 ${model} ${modelVersion} predicts for ${date}:\n\n${predictionsText}\n\nvia Futurizzm.com`;
  };

  const handleCopyToClipboard = async () => {
    const text = getShareText();
    try {
      // Try modern clipboard API first (requires HTTPS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShareToTwitter = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    setShowShareMenu(false);
  };

  const handleShareToFacebook = () => {
    const url = encodeURIComponent("https://futurizzm.com");
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
    );
    setShowShareMenu(false);
  };

  const handleShareToLinkedIn = () => {
    const url = encodeURIComponent("https://futurizzm.com");
    const text = encodeURIComponent(getShareText());
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
    );
    setShowShareMenu(false);
  };

  if (isLoading) {
    return (
      <div className="futuristic-card bg-card/50 backdrop-blur-sm p-3 md:p-4 flex flex-col gap-3 md:gap-4 min-w-[260px] md:min-w-[280px] max-w-[300px] md:max-w-[320px] animate-pulse">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-8 bg-muted rounded w-full" />
        <div className="h-6 bg-muted rounded w-32" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "futuristic-card bg-card/50 backdrop-blur-sm p-3 md:p-4 flex flex-col gap-3 md:gap-4 min-w-[260px] md:min-w-[280px] max-w-[300px] md:max-w-[320px] transition-all duration-300",
        "md:hover:scale-[1.02] md:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] md:hover:border-white/40",
        isSelected &&
          "md:shadow-[0_0_15px_rgba(255,255,255,0.3)] md:border-white/80",
      )}
      style={isSelected ? { borderColor: undefined } : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="corner-accent top-right" />
      <div className="corner-accent bottom-left" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{date}</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-muted-foreground/50 flex items-center justify-center">
            <div className="w-1 h-1 bg-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Category header */}
      <div
        className="py-1.5 md:py-2 px-2 md:px-3 -mx-1 font-mono font-semibold tracking-wider text-xs md:text-sm"
        style={{
          background: `linear-gradient(90deg, ${categoryColor}20 0%, transparent 100%)`,
          borderLeft: `3px solid ${categoryColor}`,
        }}
      >
        {category}
      </div>

      {/* Model info */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 md:w-7 md:h-7 rounded flex items-center justify-center overflow-hidden">
          {modelIcons[model]}
        </div>
        <span className="font-mono text-xs md:text-sm font-semibold">
          {model} {modelVersion}
        </span>
        <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
          Predictions
        </span>
      </div>

      {/* Predictions list */}
      <div className="flex flex-col gap-2 md:gap-3">
        {predictions.map((prediction, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 text-sm">✦</span>
              <span className="font-mono text-xs md:text-sm font-medium">
                {prediction.title}
              </span>
            </div>
            <div className="ml-5 flex flex-col gap-1">
              <span
                className="text-[9px] md:text-[10px] font-mono px-1.5 py-0.5 rounded w-fit font-bold"
                style={{
                  backgroundColor: `${prediction.chanceColor}20`,
                  color: prediction.chanceColor,
                }}
              >
                {prediction.chance}% chance
              </span>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                {prediction.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30 mt-auto">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs md:text-sm transition-colors",
            liked
              ? "text-red-500"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart
            className={cn("w-3 h-3 md:w-4 md:h-4", liked && "fill-current")}
          />
          <span className="font-mono">{formatLikes(displayLikes)}</span>
        </button>

        {/* Share menu */}
        <div className="relative" ref={shareMenuRef}>
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 className="w-3 h-3 md:w-4 md:h-4" />
          </button>

          {showShareMenu && (
            <div className="absolute right-0 bottom-full mb-2 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[160px] z-50">
              <button
                onClick={handleCopyToClipboard}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-secondary transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <button
                onClick={handleShareToTwitter}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-secondary transition-colors"
              >
                <X className="w-3 h-3" />
                Share to X
              </button>
              <button
                onClick={handleShareToFacebook}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-secondary transition-colors"
              >
                <span className="w-3 h-3 font-bold text-[10px]">f</span>
                Share to Facebook
              </button>
              <button
                onClick={handleShareToLinkedIn}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-secondary transition-colors"
              >
                <span className="w-3 h-3 font-bold text-[10px]">in</span>
                Share to LinkedIn
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
