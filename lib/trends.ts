/**
 * Google Trends RSS Feed Integration
 * Uses the official Google Trends RSS feed instead of the unreliable npm package
 * RSS Feed URL: https://trends.google.com/trending/rss?geo=US
 */

export interface TrendingCategory {
    name: string;      // Category name derived from trend
    topics: string[];  // Trending topic titles
}

interface TrendItem {
    title: string;
    traffic: string;
    newsTitle?: string;
}

const RSS_URL = 'https://trends.google.com/trending/rss?geo=US';

// Fallback categories if RSS fails
const FALLBACK_CATEGORIES: TrendingCategory[] = [
    { name: 'Politics', topics: ['Government Update', 'Policy Change', 'Election News'] },
    { name: 'Sports', topics: ['Game Today', 'Player News', 'Team Update'] },
    { name: 'Business', topics: ['Market Move', 'Tech News', 'Economy Update'] },
    { name: 'Science', topics: ['Discovery Made', 'Research Update', 'Space News'] },
];

/**
 * Fetches 4 trending categories with 3 topics each from Google Trends RSS
 */
export async function getTrendingCategories(): Promise<TrendingCategory[]> {
    try {
        const response = await fetch(RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FuturizmBot/1.0)',
            },
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
        }

        const xml = await response.text();
        const trends = parseRSSTrends(xml);

        if (trends.length === 0) {
            console.warn('No trends found in RSS, using fallback');
            return FALLBACK_CATEGORIES;
        }

        // Group trends into 4 categories of 3 topics each
        return groupTrendsIntoCategories(trends);
    } catch (error) {
        console.error('Error fetching Google Trends RSS:', error);
        return FALLBACK_CATEGORIES;
    }
}

/**
 * Parse RSS XML to extract trend items
 */
function parseRSSTrends(xml: string): TrendItem[] {
    const trends: TrendItem[] = [];

    // Extract all <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        // Extract title
        const titleMatch = /<title>([^<]+)<\/title>/.exec(itemXml);
        const title = titleMatch ? decodeXMLEntities(titleMatch[1].trim()) : null;

        // Extract traffic
        const trafficMatch = /<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/.exec(itemXml);
        const traffic = trafficMatch ? trafficMatch[1] : '0';

        // Extract first news item title for context
        const newsMatch = /<ht:news_item_title>([^<]+)<\/ht:news_item_title>/.exec(itemXml);
        const newsTitle = newsMatch ? decodeXMLEntities(newsMatch[1]) : undefined;

        if (title) {
            trends.push({ title, traffic, newsTitle });
        }
    }

    return trends;
}

/**
 * Decode XML entities like &amp; &apos; &quot;
 */
function decodeXMLEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

/**
 * Group trends into 4 categories with 3 topics each
 * Uses first word capitalized as category name
 */
function groupTrendsIntoCategories(trends: TrendItem[]): TrendingCategory[] {
    // Sort by traffic (higher first)
    const sortedTrends = [...trends].sort((a, b) => {
        const numA = parseInt(a.traffic.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.traffic.replace(/[^0-9]/g, '')) || 0;
        return numB - numA;
    });

    // Take top 12 trends and divide into 4 categories
    const topTrends = sortedTrends.slice(0, 12);
    const categories: TrendingCategory[] = [];

    for (let i = 0; i < 4; i++) {
        const categoryTrends = topTrends.slice(i * 3, i * 3 + 3);

        if (categoryTrends.length > 0) {
            // Use first significant word from the first trend as category name
            const categoryName = extractCategoryName(categoryTrends[0].title, i);

            categories.push({
                name: categoryName,
                topics: categoryTrends.map(t => t.title),
            });
        }
    }

    // Fill in with fallbacks if needed
    while (categories.length < 4) {
        categories.push(FALLBACK_CATEGORIES[categories.length]);
    }

    return categories;
}

/**
 * Extract a category name from a trend title
 */
function extractCategoryName(title: string, fallbackIndex: number): string {
    const fallbackNames = ['Trending', 'Popular', 'Hot', 'Viral'];

    // Get first capitalized word longer than 2 chars
    const words = title.split(/\s+/);
    const validWord = words.find(w => w.length > 2 && /^[A-Za-z]/.test(w));

    if (validWord) {
        return validWord.charAt(0).toUpperCase() + validWord.slice(1).toLowerCase();
    }

    return fallbackNames[fallbackIndex] || 'Trending';
}
