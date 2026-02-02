// Single prediction item (3 per model per day)
export interface PredictionItem {
    title: string;        // 3-4 words, headline tone
    chance: number;       // 0-100 percentage
    chanceColor: string;  // '#ef4444' (red) or '#22c55e' (green)
    content: string;      // 25-30 words: what will happen + overlooked signals
}

// Full prediction record from database
export interface Prediction {
    id: string;
    date: string;                    // ISO date: '2026-01-31'
    model: 'grok' | 'claude' | 'gpt' | 'gemini';
    category: string;                // Single word from trends
    predictions: PredictionItem[];   // Array of 3 items
    likes_count: number;
    created_at: string;
}

// For inserting new predictions
export interface PredictionInsert {
    date: string;
    model: string;
    category: string;
    predictions: PredictionItem[];
}

// Model configuration
export const MODEL_CONFIG = {
    grok: { id: 'xai/grok-4', label: 'GROK', version: '4' },
    claude: { id: 'anthropic/claude-sonnet-4.5', label: 'CLAUDE', version: '4.5' },
    gpt: { id: 'openai/gpt-5.2', label: 'GPT', version: '5' },
    gemini: { id: 'google/gemini-3-pro', label: 'GEMINI', version: '3' },
} as const;

export type ModelKey = keyof typeof MODEL_CONFIG;
