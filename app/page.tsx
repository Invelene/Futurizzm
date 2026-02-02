"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { CountdownTimer, CountdownTimerMobile } from "@/components/countdown-timer"
import { PredictionTimeline } from "@/components/prediction-timeline"
import { CalendarSidebar } from "@/components/calendar-sidebar"
import { getPredictionDate, parseDateString } from "@/lib/time-utils"

export default function HomePage() {
  // Start at February 1, 2026 (day 1)
  const [selectedDate, setSelectedDate] = useState(1)
  const [modelDates, setModelDates] = useState([1, 1, 1, 1])
  const [selectedModel, setSelectedModel] = useState<number | null>(null)
  const [scrollAllMode, setScrollAllMode] = useState(true)
  const [highlightedDate, setHighlightedDate] = useState(1)

  const handleModelDateChange = (modelIndex: number, date: number) => {
    setModelDates((prev) => {
      const newDates = [...prev]
      newDates[modelIndex] = date
      return newDates
    })
  }

  const handleReset = () => {
    // Reset to current prediction date
    const currentDateStr = getPredictionDate()
    const { day } = parseDateString(currentDateStr)
    setModelDates([day, day, day, day])
    setSelectedDate(day)
    setHighlightedDate(day)
    setSelectedModel(null)
    setScrollAllMode(true)
  }

  const handleModelSelect = (modelIndex: number | null) => {
    if (modelIndex === selectedModel) {
      // Toggle off if clicking same model
      setSelectedModel(null)
      setScrollAllMode(true)
    } else if (modelIndex !== null) {
      setSelectedModel(modelIndex)
      setScrollAllMode(false)
    }
  }

  const handleDateSelect = useCallback((date: number) => {
    setSelectedDate(date)
    setHighlightedDate(date)
    setModelDates([date, date, date, date])
    setSelectedModel(null)
    setScrollAllMode(true)
  }, [])

  const handleDateChange = (date: number) => {
    setSelectedDate(date)
    // Note: highlightedDate does NOT change when scrolling via nav arrows
    setModelDates([date, date, date, date])
  }

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />

      <main className="flex-1 flex flex-col md:flex-row">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          <div className="py-2 md:py-4 px-4 md:px-6 text-center">
            <h1 className="text-xs sm:text-sm md:text-xl lg:text-2xl font-mono tracking-wide text-foreground max-w-4xl mx-auto text-balance leading-relaxed">
              AI Predicting Everyday for the Next 100 Years of Human Civilization
            </h1>
          </div>

          {/* Predictions section */}
          <div className="flex-1 flex items-start px-2 md:px-3 gap-1">
            {/* Prediction Timeline */}
            <div className="flex-1">
              <PredictionTimeline
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                modelDates={modelDates}
                onModelDateChange={handleModelDateChange}
                selectedModel={selectedModel}
                onModelSelect={handleModelSelect}
                scrollAllMode={scrollAllMode}
              />
            </div>
          </div>
        </div>

        <div className="hidden md:flex h-full">
          <CalendarSidebar
            selectedDate={selectedDate}
            highlightedDate={highlightedDate}
            onDateSelect={handleDateSelect}
            onReset={handleReset}
          />
        </div>
      </main>

      <div className="md:hidden flex flex-col gap-0">
        {/* Countdown timer */}
        <div className="flex justify-center py-3 border-t border-border/30 bg-card/30">
          <CountdownTimerMobile />
        </div>

        {/* Calendar component */}
        <CalendarSidebar
          selectedDate={selectedDate}
          highlightedDate={highlightedDate}
          onDateSelect={handleDateSelect}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}
