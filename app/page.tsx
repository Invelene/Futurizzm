"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import {
  CountdownTimer,
  CountdownTimerMobile,
} from "@/components/countdown-timer";
import { PredictionTimeline } from "@/components/prediction-timeline";
import { CalendarSidebar } from "@/components/calendar-sidebar";
import { getPredictionDate, parseDateString } from "@/lib/time-utils";

// Type for timeline ref
interface PredictionTimelineRef {
  scrollToDate: (date: number) => void;
}

export default function HomePage() {
  // Initial date will be updated when timeline loads and reports latest available date
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [modelDates, setModelDates] = useState<number[] | null>(null);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [scrollAllMode, setScrollAllMode] = useState(true);
  const [highlightedDate, setHighlightedDate] = useState<number | null>(null);
  const initializedRef = useRef(false);

  // Ref to timeline for imperative scroll control
  const timelineRef = useRef<PredictionTimelineRef>(null);

  // Track if date change was from calendar click (vs scroll)
  const dateFromCalendarRef = useRef(false);

  // Called by PredictionTimeline when it determines the latest available date
  const handleLatestDateAvailable = useCallback((latestDate: number) => {
    // Only initialize once
    if (initializedRef.current) return;
    initializedRef.current = true;

    setSelectedDate(latestDate);
    setModelDates([latestDate, latestDate, latestDate, latestDate]);
    setHighlightedDate(latestDate);
  }, []);

  const handleModelDateChange = (modelIndex: number, date: number) => {
    setModelDates((prev) => {
      const newDates = [...(prev || [date, date, date, date])];
      newDates[modelIndex] = date;
      return newDates;
    });
  };

  const handleReset = () => {
    // Reset to current prediction date
    const currentDateStr = getPredictionDate();
    const { day } = parseDateString(currentDateStr);
    setModelDates([day, day, day, day]);
    setSelectedDate(day);
    setHighlightedDate(day);
    setSelectedModel(null);
    setScrollAllMode(true);

    // Force scroll to date (needed if selectedDate hasn't changed but user scrolled away)
    timelineRef.current?.scrollToDate(day);
  };

  const handleModelSelect = (modelIndex: number | null) => {
    if (modelIndex === selectedModel) {
      // Toggle off if clicking same model
      setSelectedModel(null);
      setScrollAllMode(true);
    } else if (modelIndex !== null) {
      setSelectedModel(modelIndex);
      setScrollAllMode(false);
    }
  };

  const handleDateSelect = useCallback((date: number) => {
    setSelectedDate(date);
    setHighlightedDate(date);
    setModelDates([date, date, date, date]);
    setSelectedModel(null);
    setScrollAllMode(true);

    // Scroll timeline to the selected date
    timelineRef.current?.scrollToDate(date);
  }, []);

  const handleDateChange = (date: number) => {
    setSelectedDate(date);
    // Note: highlightedDate does NOT change when scrolling via nav arrows
    setModelDates([date, date, date, date]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />

      <main className="flex-1 flex flex-col md:flex-row">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          <div className="py-2 md:py-4 px-3 md:px-6 text-center">
            <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl font-mono tracking-wide text-foreground max-w-4xl mx-auto text-balance leading-relaxed">
              AI Predicting Everyday for the Next 100 Years of Human
              Civilization
            </h1>
          </div>

          {/* Predictions section */}
          <div className="flex-1 flex items-start px-2 md:px-3 gap-1">
            {/* Prediction Timeline */}
            <div className="flex-1">
              <PredictionTimeline
                ref={timelineRef}
                selectedDate={selectedDate ?? 1}
                onDateChange={handleDateChange}
                modelDates={modelDates ?? [1, 1, 1, 1]}
                onModelDateChange={handleModelDateChange}
                selectedModel={selectedModel}
                onModelSelect={handleModelSelect}
                scrollAllMode={scrollAllMode}
                onLatestDateAvailable={handleLatestDateAvailable}
                onVisibleDateChange={(date) => setHighlightedDate(date)}
              />
            </div>
          </div>
        </div>

        <div className="hidden md:flex h-full">
          <CalendarSidebar
            selectedDate={selectedDate ?? 1}
            highlightedDate={highlightedDate ?? 1}
            onDateSelect={handleDateSelect}
            onReset={handleReset}
          />
        </div>
      </main>

      <div className="md:hidden flex flex-col gap-0">
        {/* Countdown timer */}
        <div className="flex justify-center py-3 border-t border-sidebar-border">
          <CountdownTimerMobile />
        </div>

        {/* Calendar component */}
        <CalendarSidebar
          selectedDate={selectedDate ?? 1}
          highlightedDate={highlightedDate ?? 1}
          onDateSelect={handleDateSelect}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
