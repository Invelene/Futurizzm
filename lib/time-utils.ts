/**
 * Time utilities for Pacific timezone calculations
 * The cron job runs at 5 AM Pacific daily - this is "hour zero" for the prediction cycle
 */

const PACIFIC_TZ = 'America/Los_Angeles'
const RESET_HOUR = 5 // 5 AM Pacific is when new predictions generate

/**
 * Get the current time in Pacific timezone
 */
export function getPacificNow(): Date {
    const now = new Date()
    // Create a date string in Pacific timezone, then parse it back
    const pacificString = now.toLocaleString('en-US', { timeZone: PACIFIC_TZ })
    return new Date(pacificString)
}

/**
 * Get the next 5 AM Pacific reset time
 */
export function getNextResetTime(): Date {
    const pacificNow = getPacificNow()
    const resetTime = new Date(pacificNow)

    // Set to 5 AM today
    resetTime.setHours(RESET_HOUR, 0, 0, 0)

    // If we're already past 5 AM Pacific today, next reset is tomorrow
    if (pacificNow >= resetTime) {
        resetTime.setDate(resetTime.getDate() + 1)
    }

    return resetTime
}

/**
 * Get time remaining until the next 5 AM Pacific reset
 */
export function getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
    const pacificNow = getPacificNow()
    const nextReset = getNextResetTime()

    const diffMs = nextReset.getTime() - pacificNow.getTime()

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return { hours, minutes, seconds }
}

/**
 * Get the current prediction cycle date in YYYY-MM-DD format
 * Before 5 AM Pacific, we're still in "yesterday's" cycle
 * After 5 AM Pacific, we're in "today's" cycle
 */
export function getPredictionDate(): string {
    const pacificNow = getPacificNow()

    // If before 5 AM, use yesterday's date
    if (pacificNow.getHours() < RESET_HOUR) {
        pacificNow.setDate(pacificNow.getDate() - 1)
    }

    const year = pacificNow.getFullYear()
    const month = String(pacificNow.getMonth() + 1).padStart(2, '0')
    const day = String(pacificNow.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

/**
 * Parse a date string (YYYY-MM-DD) into day/month/year components
 */
export function parseDateString(dateStr: string): { day: number; month: number; year: number } {
    const [year, month, day] = dateStr.split('-').map(Number)
    return { day, month: month - 1, year } // month is 0-indexed
}
