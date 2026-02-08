"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PredictionCard, type Prediction } from "./prediction-card";
import {
  MODEL_CONFIG,
  type Prediction as DBPrediction,
} from "@/lib/database.types";
import { getPredictionDate, parseDateString } from "@/lib/time-utils";

interface ModelDisplayConfig {
  model: string;
  modelVersion: string;
  modelKey: "grok" | "claude" | "gpt" | "gemini";
}

const modelDisplayConfigs: ModelDisplayConfig[] = [
  { model: "GROK", modelVersion: "4.1", modelKey: "grok" },
  { model: "CLAUDE", modelVersion: "4.5", modelKey: "claude" },
  { model: "GPT", modelVersion: "5.2", modelKey: "gpt" },
  { model: "GEMINI", modelVersion: "3", modelKey: "gemini" },
];

// Category colors based on model index
function getCategoryColor(category: string, index: number): string {
  const colors = ["#ef4444", "#22c55e", "#f97316", "#06b6d4"];
  return colors[index % colors.length];
}

interface PredictionTimelineProps {
  selectedDate: number;
  onDateChange: (date: number) => void;
  modelDates: number[];
  onModelDateChange: (modelIndex: number, date: number) => void;
  selectedModel: number | null;
  onModelSelect: (modelIndex: number | null) => void;
  scrollAllMode: boolean;
  onLatestDateAvailable?: (latestDate: number) => void; // Callback when latest date is known
  onVisibleDateChange?: (visibleDate: number) => void; // Callback when visible date changes (at 2/3 position)
}

interface PredictionTimelineRef {
  scrollToDate: (date: number) => void;
}

interface PredictionsByModel {
  [modelKey: string]: DBPrediction | null;
}

// Smart ConnectingLine - calculates its height to align cards from top edge
function ConnectingLine({
  hidden,
  currentCardHeight = 0,
  maxRowHeight = 0,
  baseGap = 40, // minimum gap between cards
}: {
  hidden: boolean;
  currentCardHeight?: number;
  maxRowHeight?: number;
  baseGap?: number;
}) {
  // Dynamic height: compensate for height difference + base gap
  const dynamicHeight =
    maxRowHeight > 0 ? maxRowHeight - currentCardHeight + baseGap : 120; // fallback if heights not yet measured

  return (
    <div
      className="flex justify-center transition-all duration-300"
      style={{
        height: `${dynamicHeight}px`,
        minHeight: `${baseGap}px`,
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
  );
}

// Get short month name from month index
function getMonthName(monthIndex: number): string {
  const monthNames = [
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
  return monthNames[monthIndex];
}

export const PredictionTimeline = forwardRef<
  PredictionTimelineRef,
  PredictionTimelineProps
>(function PredictionTimeline(
  {
    selectedDate,
    onDateChange,
    modelDates,
    onModelDateChange,
    selectedModel,
    onModelSelect,
    scrollAllMode,
    onLatestDateAvailable,
    onVisibleDateChange,
  },
  ref,
) {
  const scrollRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [isAligned, setIsAligned] = useState(true);
  const [predictions, setPredictions] = useState<
    Record<string, PredictionsByModel>
  >({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]); // Date strings: YYYY-MM-DD
  const [mobileDateIndex, setMobileDateIndex] = useState(0); // For mobile swipe navigation

  // Track card heights per row for dynamic alignment
  // Structure: Map<dateStr, Map<modelKey, height>>
  const [cardHeights, setCardHeights] = useState<
    Map<string, Map<string, number>>
  >(new Map());

  // Register card height when it renders/resizes
  const registerCardHeight = useCallback(
    (dateStr: string, modelKey: string, height: number) => {
      setCardHeights((prev) => {
        const newMap = new Map(prev);
        if (!newMap.has(dateStr)) {
          newMap.set(dateStr, new Map());
        }
        newMap.get(dateStr)!.set(modelKey, height);
        return newMap;
      });
    },
    [],
  );

  // Get max height for a row (date)
  const getMaxHeightForRow = useCallback(
    (dateStr: string): number => {
      const rowHeights = cardHeights.get(dateStr);
      if (!rowHeights || rowHeights.size === 0) return 0;
      return Math.max(...rowHeights.values());
    },
    [cardHeights],
  );

  // Get height for a specific card
  const getCardHeight = useCallback(
    (dateStr: string, modelKey: string): number => {
      return cardHeights.get(dateStr)?.get(modelKey) || 0;
    },
    [cardHeights],
  );

  const cardHeight = 520;
  const connectorHeight = 120;
  const totalRowHeight = cardHeight + connectorHeight;
  const scrollAmount = 150;

  // Use ref to track fetched dates to avoid stale closure issues
  const fetchedDatesRef = useRef<Set<string>>(new Set());
  const fetchedAvailableDatesRef = useRef(false);

  // Fetch available dates from API on mount
  useEffect(() => {
    if (fetchedAvailableDatesRef.current) return;
    fetchedAvailableDatesRef.current = true;

    async function fetchAvailableDates() {
      try {
        const response = await fetch("/api/predictions/dates");
        if (response.ok) {
          const data = await response.json();
          if (data.dates && data.dates.length > 0) {
            setAvailableDates(data.dates); // Already sorted descending from API
          } else {
            // Fallback to current prediction date if no dates in DB
            setAvailableDates([getPredictionDate()]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch available dates:", error);
        setAvailableDates([getPredictionDate()]);
      }
    }
    fetchAvailableDates();
  }, []);

  // Notify parent when latest available date is determined
  useEffect(() => {
    if (availableDates.length > 0 && onLatestDateAvailable) {
      // availableDates is sorted descending, so first is latest
      const latestDateStr = availableDates[0];
      const { day } = parseDateString(latestDateStr);
      onLatestDateAvailable(day);
    }
  }, [availableDates, onLatestDateAvailable]);

  // IntersectionObserver to detect when cards reach 2/3 viewport position for calendar highlight
  const visibleDateObserverRef = useRef<IntersectionObserver | null>(null);
  const observedCardsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (!onVisibleDateChange) return;

    // Create observer that triggers when card is at 2/3 (66%) down the viewport
    // rootMargin: "-66% 0px 0px 0px" means the observation zone is 66% from the top
    visibleDateObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dateStr = entry.target.getAttribute("data-date");
            if (dateStr) {
              const { day } = parseDateString(dateStr);
              onVisibleDateChange(day);
            }
          }
        });
      },
      {
        root: null, // viewport
        rootMargin: "-66% 0px 0px 0px", // 2/3 down from top
        threshold: 0,
      },
    );

    // Observe all currently tracked cards
    observedCardsRef.current.forEach((el) => {
      visibleDateObserverRef.current?.observe(el);
    });

    return () => {
      visibleDateObserverRef.current?.disconnect();
    };
  }, [onVisibleDateChange]);

  // Function to register card for visibility observation
  const registerCardForVisibility = useCallback(
    (el: HTMLElement | null, dateStr: string) => {
      if (el && !observedCardsRef.current.has(el)) {
        el.setAttribute("data-date", dateStr);
        observedCardsRef.current.add(el);
        visibleDateObserverRef.current?.observe(el);
      }
    },
    [],
  );

  // Fetch predictions for a specific date string (YYYY-MM-DD)
  const fetchPredictionsForDate = useCallback(async (dateStr: string) => {
    // Skip if already fetched
    if (fetchedDatesRef.current.has(dateStr)) return;
    fetchedDatesRef.current.add(dateStr);

    setLoading((prev) => ({ ...prev, [dateStr]: true }));

    try {
      const response = await fetch(`/api/predictions?date=${dateStr}`);
      if (response.ok) {
        const data: DBPrediction[] = await response.json();

        // Organize by model
        const byModel: PredictionsByModel = {};
        for (const pred of data) {
          byModel[pred.model] = pred;
        }

        setPredictions((prev) => ({ ...prev, [dateStr]: byModel }));
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error);
      // Remove from fetched set so it can be retried
      fetchedDatesRef.current.delete(dateStr);
    } finally {
      setLoading((prev) => ({ ...prev, [dateStr]: false }));
    }
  }, []);

  // Fetch predictions for all available dates when they load
  useEffect(() => {
    availableDates.forEach((dateStr) => {
      fetchPredictionsForDate(dateStr);
    });
  }, [availableDates, fetchPredictionsForDate]);

  const scrollModel = useCallback(
    (modelIndex: number, direction: "up" | "down") => {
      const container = scrollRefs.current.get(modelIndex);
      if (container) {
        const amount = direction === "up" ? -scrollAmount : scrollAmount;
        container.scrollBy({
          top: amount,
          behavior: "smooth",
        });
      }
    },
    [],
  );

  const scrollToDate = useCallback(
    (date: number) => {
      // Find the date string that matches this day number
      const dateIndex = availableDates.findIndex((dateStr) => {
        const parsed = parseDateString(dateStr);
        return parsed.day === date;
      });
      if (dateIndex === -1) return;

      const targetScroll = dateIndex * totalRowHeight;

      scrollRefs.current.forEach((container) => {
        container.scrollTo({
          top: targetScroll,
          behavior: "smooth",
        });
      });

      setTimeout(() => {
        setIsAligned(true);
      }, 500);
    },
    [totalRowHeight, availableDates],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToDate,
    }),
    [scrollToDate],
  );

  const handleScroll = useCallback(() => {
    setIsAligned(false);

    setTimeout(() => {
      let finalAligned = true;
      scrollRefs.current.forEach((container) => {
        const scrollPos = container.scrollTop;
        const remainder = scrollPos % totalRowHeight;
        if (remainder >= 10 && remainder <= totalRowHeight - 10) {
          finalAligned = false;
        }
      });
      setIsAligned(finalAligned);
    }, 150);
  }, [totalRowHeight]);

  const navigateUp = () => {
    setIsAligned(false);
    if (scrollAllMode) {
      modelDisplayConfigs.forEach((_, index) => {
        scrollModel(index, "up");
      });
    } else if (selectedModel !== null) {
      scrollModel(selectedModel, "up");
    }
  };

  const navigateDown = () => {
    setIsAligned(false);
    if (scrollAllMode) {
      modelDisplayConfigs.forEach((_, index) => {
        scrollModel(index, "down");
      });
    } else if (selectedModel !== null) {
      scrollModel(selectedModel, "down");
    }
  };

  useEffect(() => {
    scrollToDate(selectedDate);
  }, [selectedDate, scrollToDate]);

  // Sync mobileDateIndex when selectedDate changes (from calendar click)
  useEffect(() => {
    // Find the index of the date in availableDates that matches selectedDate
    const matchingIndex = availableDates.findIndex((dateStr) => {
      const { day } = parseDateString(dateStr);
      return day === selectedDate;
    });
    if (matchingIndex >= 0) {
      setMobileDateIndex(matchingIndex);
    }
  }, [selectedDate, availableDates]);

  const navigatePreviousModel = () => {
    setCurrentModelIndex((prev) =>
      prev > 0 ? prev - 1 : modelDisplayConfigs.length - 1,
    );
  };

  const navigateNextModel = () => {
    setCurrentModelIndex((prev) =>
      prev < modelDisplayConfigs.length - 1 ? prev + 1 : 0,
    );
  };

  // Get prediction data for a model on a date string
  const getPredictionDataForDate = (modelKey: string, dateStr: string) => {
    return predictions[dateStr]?.[modelKey] || null;
  };

  // Format date display from date string
  const formatDateDisplay = (dateStr: string): string => {
    const parsed = parseDateString(dateStr);
    return `${getMonthName(parsed.month)} ${parsed.day}`;
  };

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

        {/* Mobile view with swipe support */}
        <MobileTimeline
          currentModelIndex={currentModelIndex}
          setCurrentModelIndex={setCurrentModelIndex}
          modelDisplayConfigs={modelDisplayConfigs}
          availableDates={availableDates}
          getPredictionDataForDate={getPredictionDataForDate}
          loading={loading}
          getCategoryColor={getCategoryColor}
          formatDateDisplay={formatDateDisplay}
          selectedDateIndex={mobileDateIndex}
          onDateIndexChange={setMobileDateIndex}
          onVisibleDateChange={onVisibleDateChange}
        />

        {/* Desktop view */}
        <div className="hidden md:block relative h-[580px]">
          <div
            className="absolute top-0 left-0 right-0 h-[6px] z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[6px] z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
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
                    if (el) scrollRefs.current.set(modelIndex, el);
                  }}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ scrollSnapType: "y mandatory" }}
                >
                  <div className="flex flex-col">
                    {availableDates.map((dateStr, dayIndex) => {
                      const pred = getPredictionDataForDate(
                        config.modelKey,
                        dateStr,
                      );
                      const isLoading = loading[dateStr];

                      return (
                        <div
                          key={`${dateStr}-${config.model}`}
                          style={{ scrollSnapAlign: "start" }}
                        >
                          <div
                            className="flex justify-center"
                            ref={(el) => {
                              if (el) {
                                // Measure and register height after render
                                requestAnimationFrame(() => {
                                  registerCardHeight(
                                    dateStr,
                                    config.modelKey,
                                    el.offsetHeight,
                                  );
                                });
                                // Register for visibility observation (calendar highlight)
                                registerCardForVisibility(el, dateStr);
                              }
                            }}
                          >
                            <PredictionCard
                              id={pred?.id}
                              category={
                                pred?.category || "Awaiting Predictions"
                              }
                              categoryColor={getCategoryColor(
                                pred?.category || "",
                                modelIndex,
                              )}
                              model={config.model}
                              modelVersion={config.modelVersion}
                              predictions={pred?.predictions || []}
                              likesCount={pred?.likes_count || 0}
                              date={formatDateDisplay(dateStr)}
                              isSelected={selectedModel === modelIndex}
                              isLoading={isLoading}
                            />
                          </div>
                          {dayIndex < availableDates.length - 1 && (
                            <ConnectingLine
                              hidden={isAligned}
                              currentCardHeight={getCardHeight(
                                dateStr,
                                config.modelKey,
                              )}
                              maxRowHeight={getMaxHeightForRow(dateStr)}
                            />
                          )}
                        </div>
                      );
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
  );
});

// Mobile Timeline component with swipe support
interface MobileTimelineProps {
  currentModelIndex: number;
  setCurrentModelIndex: (index: number) => void;
  modelDisplayConfigs: ModelDisplayConfig[];
  availableDates: string[];
  getPredictionDataForDate: (
    modelKey: string,
    dateStr: string,
  ) => DBPrediction | null;
  loading: Record<string, boolean>;
  getCategoryColor: (category: string, index: number) => string;
  formatDateDisplay: (dateStr: string) => string;
  // Controlled date props for calendar sync
  selectedDateIndex: number;
  onDateIndexChange: (index: number) => void;
  onVisibleDateChange?: (day: number) => void;
}

function MobileTimeline({
  currentModelIndex,
  setCurrentModelIndex,
  modelDisplayConfigs,
  availableDates,
  getPredictionDataForDate,
  loading,
  getCategoryColor,
  formatDateDisplay,
  selectedDateIndex,
  onDateIndexChange,
  onVisibleDateChange,
}: MobileTimelineProps) {
  const config = modelDisplayConfigs[currentModelIndex];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch tracking for horizontal swipe detection
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const isHorizontalSwipe = useRef(false);

  // Flag to prevent scroll handler from updating date during programmatic scroll
  const isScrollingToDateRef = useRef(false);

  // Scroll to selected date when it changes (from calendar click)
  useEffect(() => {
    if (!scrollContainerRef.current || availableDates.length === 0) return;

    const container = scrollContainerRef.current;
    const targetCard = container.querySelector(
      `[data-date-index="${selectedDateIndex}"]`,
    ) as HTMLElement;

    if (targetCard) {
      isScrollingToDateRef.current = true;
      targetCard.scrollIntoView({ behavior: "smooth", block: "start" });

      // Reset flag after scroll completes
      setTimeout(() => {
        isScrollingToDateRef.current = false;
      }, 500);
    }
  }, [selectedDateIndex, availableDates.length]);

  // Handle scroll end detection for hover effect
  const handleScrollEnd = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Track scroll to update visible date and hover effect
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    handleScrollEnd();

    // Skip date detection during programmatic scroll
    if (isScrollingToDateRef.current) return;

    if (!scrollContainerRef.current) return;

    // Find which card is most visible (at 1/3 from top)
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const checkY = containerRect.top + containerRect.height * 0.33;

    const cards = container.querySelectorAll("[data-date-index]");
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const rect = card.getBoundingClientRect();
      if (rect.top <= checkY && rect.bottom > checkY) {
        const dateIndex = parseInt(card.getAttribute("data-date-index") || "0");
        if (dateIndex !== selectedDateIndex) {
          onDateIndexChange(dateIndex);
          if (onVisibleDateChange && availableDates[dateIndex]) {
            const { day } = parseDateString(availableDates[dateIndex]);
            onVisibleDateChange(day);
          }
        }
        break;
      }
    }
  }, [
    selectedDateIndex,
    onDateIndexChange,
    onVisibleDateChange,
    availableDates,
    handleScrollEnd,
  ]);

  // Horizontal swipe detection for model switching
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    isHorizontalSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // Detect if this is a horizontal swipe (for model switching)
    if (deltaX > deltaY * 1.5 && deltaX > 20) {
      isHorizontalSwipe.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Only switch models on clear horizontal swipe
    if (isHorizontalSwipe.current && Math.abs(deltaX) > 50 && velocity > 0.3) {
      if (deltaX < 0) {
        // Swipe left - next model
        setCurrentModelIndex(
          (currentModelIndex + 1) % modelDisplayConfigs.length,
        );
      } else {
        // Swipe right - previous model
        setCurrentModelIndex(
          currentModelIndex > 0
            ? currentModelIndex - 1
            : modelDisplayConfigs.length - 1,
        );
      }
    }

    touchStartRef.current = null;
  };

  return (
    <div className="md:hidden relative">
      {/* Scroll container with hover effect */}
      <div
        ref={scrollContainerRef}
        className={`h-[70vh] overflow-y-auto overflow-x-hidden px-3 py-4 transition-all duration-150 ${
          isScrolling ? "ring-1 ring-foreground/20 ring-inset" : ""
        }`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hide webkit scrollbar */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Vertical feed of prediction cards */}
        <div className="flex flex-col gap-4">
          {availableDates.map((dateStr, dateIndex) => {
            const pred = getPredictionDataForDate(config.modelKey, dateStr);
            const isLoading = loading[dateStr];

            return (
              <div
                key={`${dateStr}-${config.modelKey}`}
                data-date-index={dateIndex}
                className="flex justify-center"
              >
                <PredictionCard
                  id={pred?.id}
                  category={pred?.category || "Loading..."}
                  categoryColor={getCategoryColor(
                    pred?.category || "",
                    currentModelIndex,
                  )}
                  model={config.model}
                  modelVersion={config.modelVersion}
                  predictions={pred?.predictions || []}
                  likesCount={pred?.likes_count || 0}
                  date={formatDateDisplay(dateStr)}
                  isLoading={isLoading || !pred}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Model navigation arrows - fixed at sides */}
      <button
        onClick={() =>
          setCurrentModelIndex(
            currentModelIndex > 0
              ? currentModelIndex - 1
              : modelDisplayConfigs.length - 1,
          )
        }
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors bg-background/80 rounded-full z-10"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() =>
          setCurrentModelIndex(
            (currentModelIndex + 1) % modelDisplayConfigs.length,
          )
        }
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors bg-background/80 rounded-full z-10"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Model navigation dots */}
      <div className="flex justify-center gap-2 py-3">
        {modelDisplayConfigs.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentModelIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentModelIndex
                ? "bg-foreground scale-125"
                : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
