"use client"

import { useState, useEffect } from "react"
import { getTimeUntilReset } from "@/lib/time-utils"

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Initialize with actual time until reset
    setTimeLeft(getTimeUntilReset())
    setMounted(true)

    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (num: number) => num.toString().padStart(2, "0")

  // Show placeholder until mounted to avoid hydration mismatch
  const displayTime = mounted
    ? `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
    : "--:--:--"

  return (
    <div className="hidden lg:block relative p-2 w-20">
      {/* Futuristic border frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-3 right-3 h-px bg-border/50" />
        <div className="absolute bottom-0 left-3 right-3 h-px bg-border/50" />
        <div className="absolute left-0 top-3 bottom-3 w-px bg-border/50" />
        <div className="absolute right-0 top-3 bottom-3 w-px bg-border/50" />
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-foreground/30" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-foreground/30" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-foreground/30" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-foreground/30" />
      </div>

      <div className="flex flex-col items-center justify-center gap-1 px-1 py-2">
        <span className="text-[7px] text-muted-foreground font-mono tracking-wider text-center leading-tight">
          Next Forecasts In
        </span>
        <span className="text-xs font-mono font-bold tracking-wider">
          {displayTime}
        </span>
      </div>
    </div>
  )
}

export function CountdownTimerMobile() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Initialize with actual time until reset
    setTimeLeft(getTimeUntilReset())
    setMounted(true)

    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (num: number) => num.toString().padStart(2, "0")

  // Show placeholder until mounted to avoid hydration mismatch
  const displayTime = mounted
    ? `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
    : "--:--:--"

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-muted-foreground font-mono tracking-wider">Next Forecasts In</span>
      <span className="text-xl font-mono font-bold tracking-wider">
        {displayTime}
      </span>
    </div>
  )
}
