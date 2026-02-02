"use client"

import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from "react"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { PredictionCard, type Prediction } from "./prediction-card"
import { MODEL_CONFIG, type Prediction as DBPrediction } from "@/lib/database.types"
import { getPredictionDate, parseDateString } from "@/lib/time-utils"

interface ModelDisplayConfig {
  model: string
  modelVersion: string
  modelKey: 'grok' | 'claude' | 'gpt' | 'gemini'
}

const modelDisplayConfigs: ModelDisplayConfig[] = [
  { model: "GROK", modelVersion: "4", modelKey: "grok" },
  { model: "CLAUDE", modelVersion: "4.5", modelKey: "claude" },
  { model: "GPT", modelVersion: "5", modelKey: "gpt" },
  { model: "GEMINI", modelVersion: "3", modelKey: "gemini" },
]

// Category colors based on model index
function getCategoryColor(category: string, index: number): string {
  const colors = ["#ef4444", "#22c55e", "#f97316", "#06b6d4"]
  return colors[index % colors.length]
}

interface PredictionTimelineProps {
  selectedDate: number
  onDateChange: (date: number) => void
  modelDates: number[]
  onModelDateChange: (modelIndex: number, date: number) => void
  selectedModel: number | null
  onModelSelect: (modelIndex: number | null) => void
  scrollAllMode: boolean
}

interface PredictionTimelineRef {
  scrollToDate: (date: number) => void
}

interface PredictionsByModel {
  [modelKey: string]: DBPrediction | null
}

function ConnectingLine({ hidden }: { hidden: boolean }) {
  return (
    <div
      className="flex justify-center transition-opacity duration-300"
      style={{
        height: "120px",
        opacity: hidden ? 0 : 1,
      }}
    >
      <div className="flex flex-col items-center gap-1 h-full py-4">
        <div className="w-2 h-2 rounded-full bg-border/60" />
        <div
          className="flex-1 w-px"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 4px, transparent 4px, transparent 8px)",
          }}
        />
        <div className="w-2 h-2 rounded-full bg-border/60" />
      </div>
    </div>
  )
}

// Get short month name from month index
function getMonthName(monthIndex: number): string {
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec']
  return monthNames[monthIndex]
}

export const PredictionTimeline = forwardRef<PredictionTimelineRef, PredictionTimelineProps>(
  function PredictionTimeline(
    { selectedDate, onDateChange, modelDates, onModelDateChange, selectedModel, onModelSelect, scrollAllMode },
    ref,
  ) {
    const scrollRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const [currentModelIndex, setCurrentModelIndex] = useState(0)
    const [isAligned, setIsAligned] = useState(true)
    const [predictions, setPredictions] = useState<Record<string, PredictionsByModel>>({})
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [availableDates, setAvailableDates] = useState<string[]>([]) // Date strings: YYYY-MM-DD

    const cardHeight = 520
    const connectorHeight = 120
    const totalRowHeight = cardHeight + connectorHeight
    const scrollAmount = 150

    // Use ref to track fetched dates to avoid stale closure issues
    const fetchedDatesRef = useRef<Set<string>>(new Set())
    const fetchedAvailableDatesRef = useRef(false)

    // Fetch available dates from API on mount
    useEffect(() => {
      if (fetchedAvailableDatesRef.current) return
      fetchedAvailableDatesRef.current = true

      async function fetchAvailableDates() {
        try {
          const response = await fetch('/api/predictions/dates')
          if (response.ok) {
            const data = await response.json()
            if (data.dates && data.dates.length > 0) {
              setAvailableDates(data.dates) // Already sorted descending from API
            } else {
              // Fallback to current prediction date if no dates in DB
              setAvailableDates([getPredictionDate()])
            }
          }
        } catch (error) {
          console.error('Failed to fetch available dates:', error)
          setAvailableDates([getPredictionDate()])
        }
      }
      fetchAvailableDates()
    }, [])

    // Fetch predictions for a specific date string (YYYY-MM-DD)
    const fetchPredictionsForDate = useCallback(async (dateStr: string) => {
      // Skip if already fetched
      if (fetchedDatesRef.current.has(dateStr)) return
      fetchedDatesRef.current.add(dateStr)
      
      setLoading(prev => ({ ...prev, [dateStr]: true }))
      
      try {
        const response = await fetch(`/api/predictions?date=${dateStr}`)
        if (response.ok) {
          const data: DBPrediction[] = await response.json()
          
          // Organize by model
          const byModel: PredictionsByModel = {}
          for (const pred of data) {
            byModel[pred.model] = pred
          }
          
          setPredictions(prev => ({ ...prev, [dateStr]: byModel }))
        }
      } catch (error) {
        console.error('Failed to fetch predictions:', error)
        // Remove from fetched set so it can be retried
        fetchedDatesRef.current.delete(dateStr)
      } finally {
        setLoading(prev => ({ ...prev, [dateStr]: false }))
      }
    }, [])

    // Fetch predictions for all available dates when they load
    useEffect(() => {
      availableDates.forEach(dateStr => {
        fetchPredictionsForDate(dateStr)
      })
    }, [availableDates, fetchPredictionsForDate])

    const scrollModel = useCallback((modelIndex: number, direction: "up" | "down") => {
      const container = scrollRefs.current.get(modelIndex)
      if (container) {
        const amount = direction === "up" ? -scrollAmount : scrollAmount
        container.scrollBy({
          top: amount,
          behavior: "smooth",
        })
      }
    }, [])

    const scrollToDate = useCallback(
      (date: number) => {
        // Find the date string that matches this day number
        const dateIndex = availableDates.findIndex(dateStr => {
          const parsed = parseDateString(dateStr)
          return parsed.day === date
        })
        if (dateIndex === -1) return

        const targetScroll = dateIndex * totalRowHeight

        scrollRefs.current.forEach((container) => {
          container.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          })
        })

        setTimeout(() => {
          setIsAligned(true)
        }, 500)
      },
      [totalRowHeight, availableDates],
    )

    useImperativeHandle(
      ref,
      () => ({
        scrollToDate,
      }),
      [scrollToDate],
    )

    const handleScroll = useCallback(() => {
      setIsAligned(false)

      setTimeout(() => {
        let finalAligned = true
        scrollRefs.current.forEach((container) => {
          const scrollPos = container.scrollTop
          const remainder = scrollPos % totalRowHeight
          if (remainder >= 10 && remainder <= totalRowHeight - 10) {
            finalAligned = false
          }
        })
        setIsAligned(finalAligned)
      }, 150)
    }, [totalRowHeight])

    const navigateUp = () => {
      setIsAligned(false)
      if (scrollAllMode) {
        modelDisplayConfigs.forEach((_, index) => {
          scrollModel(index, "up")
        })
      } else if (selectedModel !== null) {
        scrollModel(selectedModel, "up")
      }
    }

    const navigateDown = () => {
      setIsAligned(false)
      if (scrollAllMode) {
        modelDisplayConfigs.forEach((_, index) => {
          scrollModel(index, "down")
        })
      } else if (selectedModel !== null) {
        scrollModel(selectedModel, "down")
      }
    }

    useEffect(() => {
      scrollToDate(selectedDate)
    }, [selectedDate, scrollToDate])

    const navigatePreviousModel = () => {
      setCurrentModelIndex((prev) => (prev > 0 ? prev - 1 : modelDisplayConfigs.length - 1))
    }

    const navigateNextModel = () => {
      setCurrentModelIndex((prev) => (prev < modelDisplayConfigs.length - 1 ? prev + 1 : 0))
    }

    // Get prediction data for a model on a date string
    const getPredictionDataForDate = (modelKey: string, dateStr: string) => {
      return predictions[dateStr]?.[modelKey] || null
    }

    // Format date display from date string
    const formatDateDisplay = (dateStr: string): string => {
      const parsed = parseDateString(dateStr)
      return `${getMonthName(parsed.month)} ${parsed.day}`
    }

    return (
      <div className="flex items-stretch">
        <div className="flex-1 relative">
          {/* Border decorations */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Top border */}
            <div className="absolute top-0 left-8 right-8 h-px bg-border/50" />
            <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-transparent to-border/50" />
            <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-transparent to-border/50" />

            {/* Bottom border */}
            <div className="absolute bottom-0 left-8 right-8 h-px bg-border/50" />
            <div className="absolute bottom-0 left-0 w-8 h-px bg-gradient-to-r from-transparent to-border/50" />
            <div className="absolute bottom-0 right-0 w-8 h-px bg-gradient-to-l from-transparent to-border/50" />

            {/* Left border */}
            <div className="absolute left-0 top-8 bottom-8 w-px bg-border/50" />
            <div className="absolute left-0 top-0 w-px h-8 bg-gradient-to-b from-transparent to-border/50" />
            <div className="absolute left-0 bottom-0 w-px h-8 bg-gradient-to-t from-transparent to-border/50" />

            {/* Right border */}
            <div className="absolute right-0 top-8 bottom-8 w-px bg-border/50" />
            <div className="absolute right-0 top-0 w-px h-8 bg-gradient-to-b from-transparent to-border/50" />
            <div className="absolute right-0 bottom-0 w-px h-8 bg-gradient-to-t from-transparent to-border/50" />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-foreground/30" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-foreground/30" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-foreground/30" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-foreground/30" />
          </div>

          {/* Mobile view */}
          <div className="md:hidden px-3 py-4">
            <div className="flex items-center gap-1">
              <button
                onClick={navigatePreviousModel}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex justify-center">
                {(() => {
                  const config = modelDisplayConfigs[currentModelIndex]
                  // Use first available date (most recent) for mobile view
                  const currentDateStr = availableDates[0] || getPredictionDate()
                  const pred = getPredictionDataForDate(config.modelKey, currentDateStr)
                  const isLoading = loading[currentDateStr]

                  return (
                    <PredictionCard
                      id={pred?.id}
                      category={pred?.category || "Loading..."}
                      categoryColor={getCategoryColor(pred?.category || "", currentModelIndex)}
                      model={config.model}
                      modelVersion={config.modelVersion}
                      predictions={pred?.predictions || []}
                      likesCount={pred?.likes_count || 0}
                      date={formatDateDisplay(currentDateStr)}
                      isLoading={isLoading || !pred}
                    />
                  )
                })()}
              </div>

              <button
                onClick={navigateNextModel}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center gap-2 mt-3">
              {modelDisplayConfigs.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentModelIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentModelIndex ? "bg-foreground scale-125" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Desktop view */}
          <div className="hidden md:block relative h-[580px]">
            <div
              className="absolute top-0 left-0 right-0 h-[6px] z-10 pointer-events-none"
              style={{
                background: "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-[6px] z-10 pointer-events-none"
              style={{
                background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
              }}
            />

            {/* Nav arrow up - hidden when only one date */}
            {availableDates.length > 1 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={navigateUp}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="flex gap-4 px-4 py-10 h-full">
              {modelDisplayConfigs.map((config, modelIndex) => (
                <div
                  key={config.model}
                  className="flex-1 flex flex-col cursor-pointer min-w-0"
                  onClick={() => onModelSelect(modelIndex)}
                >
                  <div
                    ref={(el) => {
                      if (el) scrollRefs.current.set(modelIndex, el)
                    }}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  >
                    <div className="flex flex-col">
                      {availableDates.map((dateStr, dayIndex) => {
                        const pred = getPredictionDataForDate(config.modelKey, dateStr)
                        const isLoading = loading[dateStr]

                        return (
                          <div key={`${dateStr}-${config.model}`}>
                            <div className="flex justify-center">
                              <PredictionCard
                                id={pred?.id}
                                category={pred?.category || "Awaiting Predictions"}
                                categoryColor={getCategoryColor(pred?.category || "", modelIndex)}
                                model={config.model}
                                modelVersion={config.modelVersion}
                                predictions={pred?.predictions || []}
                                likesCount={pred?.likes_count || 0}
                                date={formatDateDisplay(dateStr)}
                                isSelected={selectedModel === modelIndex}
                                isLoading={isLoading}
                              />
                            </div>
                            {dayIndex < availableDates.length - 1 && <ConnectingLine hidden={isAligned} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nav arrow down - hidden when only one date */}
            {availableDates.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={navigateDown}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
)
