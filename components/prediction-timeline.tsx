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
  onVisibleDateChange?: (info: {
    day: number;
    month: number;
    year: number;
  }) => void; // Callback when visible date changes
}

export interface PredictionTimelineRef {
  scrollToDate: (date: number | string) => void;
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
      const maxRetries = 3;
      let attempt = 0;
      let delay = 1000;

      while (attempt < maxRetries) {
        try {
          const response = await fetch("/api/predictions/dates");
          if (response.ok) {
            const data = await response.json();
            if (data.dates && data.dates.length > 0) {
              setAvailableDates(data.dates); // Already sorted descending from API
              return; // Success, exit
            } else {
              // Valid response but no dates
              setAvailableDates([getPredictionDate()]);
              return;
            }
          }
          // If 500 error, throw to trigger retry
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }
          // If 4xx, don't retry, just fallback
          console.error("Client error fetching dates:", response.status);
          break;
        } catch (error) {
          attempt++;
          console.error(`Attempt ${attempt} failed to fetch dates:`, error);
          if (attempt >= maxRetries) break;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      // Fallback if all retries failed
      setAvailableDates([getPredictionDate()]);
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

  // Scroll-based highlight detection: finds which date card is most visible in the first column
  // Only fires when scrollAllMode is true (all columns moving together)
  const scrollAllModeRef = useRef(scrollAllMode);
  const lastReportedDateRef = useRef<string | null>(null);

  // Keep ref in sync with prop
  useEffect(() => {
    scrollAllModeRef.current = scrollAllMode;
  }, [scrollAllMode]);

  const updateVisibleDate = useCallback(() => {
    if (!onVisibleDateChange || !scrollAllModeRef.current) return;

    // Use first column as reference
    const container = scrollRefs.current.get(0);
    if (!container) return;

    const cards = container.querySelectorAll("[data-date]");
    if (!cards.length) return;

    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const containerBottom = containerTop + containerHeight;

    let bestDate: string | null = null;
    let bestVisibleArea = 0;

    cards.forEach((card) => {
      const el = card as HTMLElement;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;

      // Calculate how much of this card is visible in the container viewport
      const visibleTop = Math.max(elTop, containerTop);
      const visibleBottom = Math.min(elBottom, containerBottom);
      const visibleArea = Math.max(0, visibleBottom - visibleTop);

      if (visibleArea > bestVisibleArea) {
        bestVisibleArea = visibleArea;
        bestDate = el.getAttribute("data-date");
      }
    });

    if (bestDate) {
      if (bestDate !== lastReportedDateRef.current) {
        lastReportedDateRef.current = bestDate;
        const { day, month, year } = parseDateString(bestDate);
        onVisibleDateChange({ day, month, year });
      }
    }
  }, [onVisibleDateChange]);

  // Legacy observer refs kept for registerCardForVisibility compatibility
  const visibleDateObserverRef = useRef<IntersectionObserver | null>(null);
  const observedCardsRef = useRef<Set<Element>>(new Set());

  // Function to register card for visibility observation (kept for ref callback compatibility)
  const registerCardForVisibility = useCallback(
    (el: HTMLElement | null, dateStr: string) => {
      if (el && !observedCardsRef.current.has(el)) {
        el.setAttribute("data-date", dateStr);
        observedCardsRef.current.add(el);
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

  // DOM-based scrollToDate — finds the actual card element instead of computing pixel offsets
  const scrollToDate = useCallback(
    (date: number | string) => {
      let targetDateStr: string | undefined;

      if (typeof date === "string") {
        targetDateStr = availableDates.find((d) => d === date);
      } else {
        targetDateStr = availableDates.find((dateStr) => {
          const parsed = parseDateString(dateStr);
          return parsed.day === date;
        });
      }

      if (!targetDateStr) return;

      scrollRefs.current.forEach((container) => {
        const targetEl = container.querySelector(
          `[data-date="${targetDateStr}"]`,
        ) as HTMLElement;
        if (targetEl) {
          // Offset by 20px so the date label at the top of the card stays visible
          const scrollOffset = Math.max(0, targetEl.offsetTop - 20);
          container.scrollTo({
            top: scrollOffset,
            behavior: "smooth",
          });
        }
      });

      setTimeout(() => {
        setIsAligned(true);
      }, 500);
    },
    [availableDates],
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
    updateVisibleDate();

    setTimeout(() => {
      setIsAligned(true);
    }, 150);
  }, []);

  // Helper: get the index of the currently visible date in a container
  const getVisibleDateIndex = useCallback(
    (container: HTMLDivElement): number => {
      const containerTop = container.scrollTop;
      const cards = container.querySelectorAll("[data-date]");
      let bestIndex = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const el = card as HTMLElement;
        const dist = Math.abs(el.offsetTop - containerTop);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      });
      return bestIndex;
    },
    [],
  );

  // Check if all columns are currently showing the same date
  const areColumnsSynced = useCallback((): boolean => {
    const indices: number[] = [];
    scrollRefs.current.forEach((container) => {
      indices.push(getVisibleDateIndex(container));
    });
    return indices.every((idx) => idx === indices[0]);
  }, [getVisibleDateIndex]);

  // Navigate to specific date index across all (or selected) columns
  const scrollToDateIndex = useCallback(
    (dateIndex: number) => {
      const dateStr = availableDates[dateIndex];
      if (!dateStr) return;

      scrollRefs.current.forEach((container) => {
        const targetEl = container.querySelector(
          `[data-date="${dateStr}"]`,
        ) as HTMLElement;
        if (targetEl) {
          container.scrollTo({
            top: targetEl.offsetTop,
            behavior: "smooth",
          });
        }
      });
    },
    [availableDates],
  );

  const navigateUp = () => {
    if (scrollAllMode) {
      if (!areColumnsSynced()) {
        const anchorDate = lastReportedDateRef.current || selectedDate;
        scrollToDate(anchorDate);
        return;
      }
      // Normal smooth scroll for all columns
      scrollRefs.current.forEach((container) => {
        container.scrollBy({ top: -150, behavior: "smooth" });
      });
    } else if (selectedModel !== null) {
      const container = scrollRefs.current.get(selectedModel);
      if (container) {
        container.scrollBy({ top: -150, behavior: "smooth" });
      }
    }
  };

  const navigateDown = () => {
    if (scrollAllMode) {
      if (!areColumnsSynced()) {
        const anchorDate = lastReportedDateRef.current || selectedDate;
        scrollToDate(anchorDate);
        return;
      }
      scrollRefs.current.forEach((container) => {
        container.scrollBy({ top: 150, behavior: "smooth" });
      });
    } else if (selectedModel !== null) {
      const container = scrollRefs.current.get(selectedModel);
      if (container) {
        container.scrollBy({ top: 150, behavior: "smooth" });
      }
    }
  };

  // Keyboard listener: RAF-based smooth continuous scroll for held arrow keys
  const scrollRafRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<"up" | "down" | null>(null);

  useEffect(() => {
    const scrollSpeed = 4; // pixels per frame (~240px/s at 60fps)

    const doRafScroll = () => {
      const dir = scrollDirectionRef.current;
      if (!dir) return;

      const amount = dir === "up" ? -scrollSpeed : scrollSpeed;

      if (scrollAllMode) {
        scrollRefs.current.forEach((container) => {
          container.scrollTop += amount;
        });
      } else if (selectedModel !== null) {
        const container = scrollRefs.current.get(selectedModel);
        if (container) container.scrollTop += amount;
      }

      // Update highlight during continuous scroll
      updateVisibleDate();

      scrollRafRef.current = requestAnimationFrame(doRafScroll);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();

        if (e.repeat) {
          // Key is held — start RAF loop if not already running
          const dir = e.key === "ArrowUp" ? "up" : "down";
          if (scrollDirectionRef.current !== dir) {
            scrollDirectionRef.current = dir;
            if (!scrollRafRef.current) {
              scrollRafRef.current = requestAnimationFrame(doRafScroll);
            }
          }
        } else {
          // Single press — use nav arrow logic (includes re-sync)
          if (e.key === "ArrowUp") navigateUp();
          else navigateDown();
        }
      } else if (e.key === "Escape" && selectedModel !== null) {
        e.preventDefault();
        onModelSelect(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        scrollDirectionRef.current = null;
        if (scrollRafRef.current) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [scrollAllMode, selectedModel, selectedDate, updateVisibleDate]);

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
                  className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ scrollSnapType: "y proximity" }}
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
                          data-date={dateStr}
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
  onVisibleDateChange?: (info: {
    day: number;
    month: number;
    year: number;
  }) => void;
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

    // Skip if we are currently scrolling manually (to avoid fighting)
    if (isScrolling) return;

    const container = scrollContainerRef.current;

    // Calculate position manually to avoid page scroll
    // We can't use scrollIntoView because it scrolls the whole page
    const targetCard = container.querySelector(
      `[data-date-index="${selectedDateIndex}"]`,
    ) as HTMLElement;

    if (targetCard) {
      isScrollingToDateRef.current = true;

      const containerTop = container.getBoundingClientRect().top;
      const cardTop = targetCard.getBoundingClientRect().top;
      const currentScroll = container.scrollTop;
      const newScroll = currentScroll + (cardTop - containerTop) - 20; // 20px padding

      container.scrollTo({
        top: newScroll,
        behavior: "smooth",
      });

      // Reset flag after scroll completes
      setTimeout(() => {
        isScrollingToDateRef.current = false;
      }, 500);
    }
  }, [selectedDateIndex, availableDates.length]); // isScrolling intentionally omitted to avoid loops

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
            const { day, month, year } = parseDateString(
              availableDates[dateIndex],
            );
            onVisibleDateChange({ day, month, year });
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
    <div className="md:hidden relative flex justify-center">
      {/* Scroll container with reduced width for side taps */}
      <div
        ref={scrollContainerRef}
        className={`h-[70vh] w-[85vw] max-w-md overflow-y-auto overflow-x-hidden px-3 py-4 transition-all duration-150 overscroll-contain ${
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
                  category={pred?.category || "Loading..."}
                  categoryColor={getCategoryColor(
                    pred?.category || "",
                    currentModelIndex,
                  )}
                  model={config.model}
                  modelVersion={config.modelVersion}
                  predictions={pred?.predictions || []}
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
