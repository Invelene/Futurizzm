"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sept", "oct", "nov", "dec"]

// Start year for the app
const START_YEAR = 2026

interface CalendarSidebarProps {
  selectedDate: number
  highlightedDate: number
  onDateSelect: (date: number) => void
  onReset: () => void
}

export function CalendarSidebar({ selectedDate, highlightedDate, onDateSelect, onReset }: CalendarSidebarProps) {
  // Initialize to current date (February 1, 2026)
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[today.getMonth()])
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [lastDropdown, setLastDropdown] = useState<"month" | "year" | null>(null)
  const [calendarScrollIndex, setCalendarScrollIndex] = useState(0)
  const [availablePredictionDates, setAvailablePredictionDates] = useState<Set<string>>(new Set())
  
  const monthDropdownRef = useRef<HTMLDivElement>(null)
  const yearDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch available prediction dates
  useEffect(() => {
    async function fetchDates() {
      try {
        const response = await fetch('/api/predictions/dates')
        if (response.ok) {
          const data = await response.json()
          setAvailablePredictionDates(new Set(data.dates || []))
        }
      } catch (error) {
        console.error('Failed to fetch prediction dates:', error)
      }
    }
    fetchDates()
  }, [])

  // Click outside handler to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(target)) {
        setShowMonthDropdown(false)
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) {
        setShowYearDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if a day has predictions
  const hasPredictions = (day: number): boolean => {
    const monthIndex = MONTHS.indexOf(selectedMonth)
    const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return availablePredictionDates.has(dateStr)
  }

  // Generate available years (from 2026 to current year + 1)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = START_YEAR; y <= currentYear + 1; y++) {
      years.push(y)
    }
    return years
  }, [])

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    const monthIndex = MONTHS.indexOf(selectedMonth)
    return new Date(selectedYear, monthIndex + 1, 0).getDate()
  }, [selectedYear, selectedMonth])

  // Generate dates for selected month
  const monthDates = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [daysInMonth])

  // Visible days for desktop (12 at a time)
  const visibleDays = monthDates.slice(calendarScrollIndex, calendarScrollIndex + 12)

  const handleDayUp = () => {
    if (calendarScrollIndex > 0) {
      setCalendarScrollIndex(calendarScrollIndex - 1)
    }
  }

  const handleDayDown = () => {
    if (calendarScrollIndex < monthDates.length - 12) {
      setCalendarScrollIndex(calendarScrollIndex + 1)
    }
  }

  const handleMonthClick = () => {
    setShowMonthDropdown(!showMonthDropdown)
    setShowYearDropdown(false)
    setLastDropdown("month")
  }

  const handleYearClick = () => {
    setShowYearDropdown(!showYearDropdown)
    setShowMonthDropdown(false)
    setLastDropdown("year")
  }

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month)
    setShowMonthDropdown(false)
    setCalendarScrollIndex(0) // Reset scroll when month changes
  }

  const handleYearSelect = (year: number) => {
    setSelectedYear(year)
    setShowYearDropdown(false)
    setCalendarScrollIndex(0) // Reset scroll when year changes
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col items-center px-4 py-4 border-l border-border/30 bg-card/30 min-w-[90px] h-full mt-[1px]">
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
                <ChevronDown className={`w-4 h-4 transition-transform ${showYearDropdown ? "rotate-180" : ""}`} />
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
                      selectedYear === year && "bg-secondary text-foreground font-semibold",
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
              <span>{selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}</span>
              {lastDropdown === "month" && (
                <ChevronDown className={`w-3 h-3 transition-transform ${showMonthDropdown ? "rotate-180" : ""}`} />
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
                      selectedMonth === month && "bg-secondary text-foreground font-semibold",
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
            const hasPred = hasPredictions(day)
            return (
              <button
                key={day}
                onClick={() => hasPred && onDateSelect(day)}
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
            )
          })}
          <span className="text-xs text-muted-foreground font-mono mt-1">{selectedMonth}</span>
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

      {/* Mobile calendar - no horizontal scroll */}
      <div className="md:hidden w-full border-t border-border/30 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDayUp}
            disabled={calendarScrollIndex === 0}
            className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-30 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Fixed width container, no horizontal scroll */}
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-2 justify-center flex-wrap">
              {monthDates.slice(0, 14).map((day) => (
                <button
                  key={day}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "w-9 h-9 rounded flex items-center justify-center font-mono text-sm transition-all duration-200 shrink-0",
                    highlightedDate === day
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/30",
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDayDown}
            disabled={calendarScrollIndex >= monthDates.length - 12}
            className="p-2 hover:bg-secondary rounded transition-colors disabled:opacity-30 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="px-3 py-1 border border-border rounded text-xs font-mono">
            {selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}
          </div>
          <div className="px-3 py-1 border border-border rounded text-xs font-mono">{selectedYear}</div>
        </div>
      </div>
    </>
  )
}
