"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sept",
  "oct",
  "nov",
  "dec",
];

// Start year for the app
const START_YEAR = 2026;

interface CalendarSidebarProps {
  selectedDate: number;
  highlightedDate: number;
  highlightedMonth: number | null;
  highlightedYear: number | null;
  onDateSelect: (date: number | string) => void;
  onReset: () => void;
}

export function CalendarSidebar({
  selectedDate,
  highlightedDate,
  highlightedMonth,
  highlightedYear,
  onDateSelect,
  onReset,
}: CalendarSidebarProps) {
  // Initialize to current date (February 1, 2026)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[today.getMonth()]);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [lastDropdown, setLastDropdown] = useState<"month" | "year" | null>(
    null,
  );
  // Initialize scroll index so highlightedDate is visible in the 12-day window
  const initialScrollIndex = Math.max(
    0,
    Math.min(
      highlightedDate - 6,
      new Date(selectedYear, MONTHS.indexOf(selectedMonth) + 1, 0).getDate() -
        12,
    ),
  );
  const [calendarScrollIndex, setCalendarScrollIndex] =
    useState(initialScrollIndex);
  const [availablePredictionDates, setAvailablePredictionDates] = useState<
    Set<string>
  >(new Set());

  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available prediction dates
  useEffect(() => {
    async function fetchDates() {
      const maxRetries = 3;
      let attempt = 0;
      let delay = 1000;

      while (attempt < maxRetries) {
        try {
          const response = await fetch("/api/predictions/dates");
          if (response.ok) {
            const data = await response.json();
            setAvailablePredictionDates(new Set(data.dates || []));
            return;
          }
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }
          console.error("Client error fetching dates:", response.status);
          break;
        } catch (error) {
          attempt++;
          console.error(`Attempt ${attempt} failed to fetch dates:`, error);
          if (attempt >= maxRetries) break;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
    fetchDates();
  }, []);

  // Auto-scroll desktop calendar to show highlighted date whenever it changes
  useEffect(() => {
    const targetIndex = highlightedDate - 1; // 0-indexed
    if (
      targetIndex < calendarScrollIndex ||
      targetIndex >= calendarScrollIndex + 12
    ) {
      const newIndex = Math.max(0, Math.min(targetIndex - 5, daysInMonth - 12));
      setCalendarScrollIndex(newIndex);
    }
  }, [highlightedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch month/year when timeline scrolls across month boundaries
  useEffect(() => {
    if (highlightedMonth !== null && highlightedYear !== null) {
      const monthStr = MONTHS[highlightedMonth];
      if (
        monthStr &&
        (monthStr !== selectedMonth || highlightedYear !== selectedYear)
      ) {
        setSelectedMonth(monthStr);
        setSelectedYear(highlightedYear);
        // Reset scroll index for new month
        const newDaysInMonth = new Date(
          highlightedYear,
          highlightedMonth + 1,
          0,
        ).getDate();
        const targetIdx = highlightedDate - 1;
        setCalendarScrollIndex(
          Math.max(0, Math.min(targetIdx - 5, newDaysInMonth - 12)),
        );
      }
    }
  }, [highlightedMonth, highlightedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside handler to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(target)
      ) {
        setShowMonthDropdown(false);
      }
      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(target)
      ) {
        setShowYearDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if a day has predictions
  const hasPredictions = (day: number): boolean => {
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return availablePredictionDates.has(dateStr);
  };

  // Generate available years (from 2026 to current year + 1)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = START_YEAR; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    const monthIndex = MONTHS.indexOf(selectedMonth);
    return new Date(selectedYear, monthIndex + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Generate dates for selected month
  const monthDates = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Visible days for desktop (12 at a time)
  const visibleDays = monthDates.slice(
    calendarScrollIndex,
    calendarScrollIndex + 12,
  );

  const handleDayUp = () => {
    if (calendarScrollIndex > 0) {
      setCalendarScrollIndex(calendarScrollIndex - 1);
    }
  };

  const handleDayDown = () => {
    if (calendarScrollIndex < monthDates.length - 12) {
      setCalendarScrollIndex(calendarScrollIndex + 1);
    }
  };

  const handleMonthClick = () => {
    setShowMonthDropdown(!showMonthDropdown);
    setShowYearDropdown(false);
    setLastDropdown("month");
  };

  const handleYearClick = () => {
    setShowYearDropdown(!showYearDropdown);
    setShowMonthDropdown(false);
    setLastDropdown("year");
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setShowMonthDropdown(false);
    setCalendarScrollIndex(0); // Reset scroll when month changes
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
    setCalendarScrollIndex(0); // Reset scroll when year changes
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col items-center px-4 py-4 border-l border-sidebar-border min-w-[90px] h-full mt-[1px]">
        <div className="flex flex-col items-center gap-2 w-full">
          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border border-border rounded hover:bg-secondary transition-colors w-full"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>

          {/* Year selector */}
          <div className="relative w-full" ref={yearDropdownRef}>
            <button
              onClick={handleYearClick}
              className="flex items-center justify-center gap-1 w-full px-3 py-2 border border-border rounded text-base font-mono font-semibold hover:bg-secondary transition-colors"
            >
              <span>{selectedYear}</span>
              {lastDropdown === "year" && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showYearDropdown ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {/* Year dropdown */}
            {showYearDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-background border border-border rounded shadow-lg py-1 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className={cn(
                      "w-full px-3 py-2 text-sm font-mono text-left hover:bg-secondary transition-colors",
                      selectedYear === year &&
                        "bg-secondary text-foreground font-semibold",
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Month selector */}
          <div className="relative w-full" ref={monthDropdownRef}>
            <button
              onClick={handleMonthClick}
              className="flex items-center justify-center gap-1 w-full px-3 py-1.5 border border-border rounded text-xs font-mono hover:bg-secondary transition-colors"
            >
              <span>
                {selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}
              </span>
              {lastDropdown === "month" && (
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showMonthDropdown ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {/* Month dropdown */}
            {showMonthDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-background border border-border rounded shadow-lg py-1 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                {MONTHS.map((month) => (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(month)}
                    className={cn(
                      "w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-secondary transition-colors",
                      selectedMonth === month &&
                        "bg-secondary text-foreground font-semibold",
                    )}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Up navigation */}
        <button
          onClick={handleDayUp}
          disabled={calendarScrollIndex === 0}
          className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-30 mt-4"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-1.5 flex-1 py-2">
          {visibleDays.map((day) => {
            const hasPred = hasPredictions(day);
            return (
              <button
                key={day}
                onClick={() => {
                  if (hasPred) {
                    const monthIndex = MONTHS.indexOf(selectedMonth);
                    const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    onDateSelect(dateStr);
                  }
                }}
                disabled={!hasPred}
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center font-mono text-sm transition-all duration-200",
                  highlightedDate === day
                    ? "bg-foreground text-background scale-110 font-bold"
                    : hasPred
                      ? "text-foreground font-semibold hover:bg-secondary cursor-pointer"
                      : "text-muted-foreground/40 cursor-default",
                )}
              >
                {day}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground font-mono mt-1">
            {selectedMonth}
          </span>
        </div>

        {/* Down navigation */}
        <button
          onClick={handleDayDown}
          disabled={calendarScrollIndex >= monthDates.length - 12}
          className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-30 mb-4"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile calendar - single line with swipe */}
      <MobileCalendar
        monthDates={monthDates}
        highlightedDate={highlightedDate}
        onDateSelect={onDateSelect}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthSelect={handleMonthSelect}
        onYearSelect={handleYearSelect}
        availableYears={availableYears}
        hasPredictions={hasPredictions}
      />
    </>
  );
}

// Mobile calendar component with swipe support
function MobileCalendar({
  monthDates,
  highlightedDate,
  onDateSelect,
  selectedMonth,
  selectedYear,
  onMonthSelect,
  onYearSelect,
  availableYears,
  hasPredictions,
}: {
  monthDates: number[];
  highlightedDate: number;
  onDateSelect: (date: number | string) => void;
  selectedMonth: string;
  selectedYear: number;
  onMonthSelect: (month: string) => void;
  onYearSelect: (year: number) => void;
  availableYears: number[];
  hasPredictions: (day: number) => boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{
    x: number;
    time: number;
  } | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  const MONTHS = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sept",
    "oct",
    "nov",
    "dec",
  ];

  // Close pickers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target as Node)
      ) {
        setShowMonthPicker(false);
      }
      if (
        yearPickerRef.current &&
        !yearPickerRef.current.contains(event.target as Node)
      ) {
        setShowYearPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll mobile calendar to center on highlighted date on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const btn = scrollRef.current.querySelector(
      `[data-day="${highlightedDate}"]`,
    ) as HTMLElement;
    if (btn) {
      // Use requestAnimationFrame to ensure DOM is laid out
      requestAnimationFrame(() => {
        btn.scrollIntoView({ inline: "center", behavior: "auto" });
      });
    }
  }, [highlightedDate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, time: Date.now() });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !scrollRef.current) return;

    const touchEnd = e.changedTouches[0].clientX;
    const deltaX = touchStart.x - touchEnd;
    const deltaTime = Date.now() - touchStart.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Scroll based on velocity
    const scrollAmount = deltaX * (1 + velocity * 2);
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTouchStart(null);
  };

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -100, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 100, behavior: "smooth" });
  };

  return (
    <div className="md:hidden w-full border-t border-sidebar-border px-2 py-3">
      {/* Calendar dates with nav arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={scrollLeft}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex-1 flex gap-2 overflow-x-auto pb-1"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {monthDates.map((day) => {
            const hasPred = hasPredictions(day);
            return (
              <button
                key={day}
                data-day={day}
                onClick={() => {
                  if (hasPred) {
                    const monthIndex = MONTHS.indexOf(selectedMonth);
                    const dateStr = `${selectedYear}-${String(MONTHS.indexOf(selectedMonth) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    onDateSelect(dateStr);
                  }
                }}
                disabled={!hasPred}
                className={cn(
                  "w-9 h-9 rounded flex items-center justify-center font-mono text-sm transition-all duration-200 shrink-0",
                  highlightedDate === day
                    ? "bg-foreground text-background font-bold"
                    : hasPred
                      ? "text-foreground hover:bg-secondary border border-border/30"
                      : "text-muted-foreground/40 border border-border/20",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        <button
          onClick={scrollRight}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month and Year selectors - no scrollbar */}
      <div className="flex items-center justify-center gap-3 mt-2">
        {/* Month selector */}
        <div className="relative" ref={monthPickerRef}>
          <button
            onClick={() => {
              setShowMonthPicker(!showMonthPicker);
              setShowYearPicker(false);
            }}
            className="px-3 py-1.5 border border-border rounded text-xs font-mono hover:bg-secondary transition-colors flex items-center gap-1"
          >
            {selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showMonthPicker ? "rotate-180" : ""}`}
            />
          </button>
          {showMonthPicker && (
            <div
              className="absolute bottom-full mb-1 left-0 z-50 bg-background border border-border rounded shadow-lg py-1 min-w-[80px]"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {MONTHS.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    onMonthSelect(month);
                    setShowMonthPicker(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-secondary transition-colors",
                    selectedMonth === month && "bg-secondary font-semibold",
                  )}
                >
                  {month}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Year selector */}
        <div className="relative" ref={yearPickerRef}>
          <button
            onClick={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
            }}
            className="px-3 py-1.5 border border-border rounded text-xs font-mono hover:bg-secondary transition-colors flex items-center gap-1"
          >
            {selectedYear}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showYearPicker ? "rotate-180" : ""}`}
            />
          </button>
          {showYearPicker && (
            <div
              className="absolute bottom-full mb-1 left-0 z-50 bg-background border border-border rounded shadow-lg py-1 min-w-[70px]"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    onYearSelect(year);
                    setShowYearPicker(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-secondary transition-colors",
                    selectedYear === year && "bg-secondary font-semibold",
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
