"use client"

import { useState } from "react"
import { PredictionCard, type Prediction } from "./prediction-card"

interface CategoryConfig {
  category: string
  categoryColor: string
  model: string
  modelVersion: string
  modelId: string
}

const categories: CategoryConfig[] = [
  { category: "Politics-USA", categoryColor: "#ef4444", model: "GROK", modelVersion: "4", modelId: "xai/grok-3" },
  {
    category: "Sports-NFL",
    categoryColor: "#22c55e",
    model: "CLAUDE",
    modelVersion: "4.5",
    modelId: "anthropic/claude-sonnet-4",
  },
  { category: "Business-USA", categoryColor: "#f97316", model: "GPT", modelVersion: "5", modelId: "openai/gpt-4o" },
  {
    category: "Science",
    categoryColor: "#06b6d4",
    model: "GEMINI",
    modelVersion: "2.5",
    modelId: "google/gemini-2.5-flash",
  },
]

const defaultPredictions: Prediction[] = [
  {
    title: "Unscheduled Launch Window",
    chance: 72,
    chanceColor: "#22c55e",
    content:
      "FAA airspace notices and ground telemetry suggest a surprise launch - possibly SpaceX or Rocket Lab - could occur before official press time.",
  },
  {
    title: "Satellite Signal Spike",
    chance: 58,
    chanceColor: "#22c55e",
    content:
      "Burst transmissions from low-orbit clusters hint that a private satellite network will quietly activate a new coverage zone.",
  },
  {
    title: "Defense Contract Ripple",
    chance: 45,
    chanceColor: "#ef4444",
    content:
      "Procurement document movements indicate a classified contract handoff between two major aerospace firms.",
  },
]

export function PredictionsGrid() {
  const [predictions, setPredictions] = useState<Record<string, Prediction[]>>(
    Object.fromEntries(categories.map((c) => [c.category, defaultPredictions])),
  )
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map((c) => [c.category, false])),
  )

  const generatePrediction = async (category: string, modelId: string) => {
    setLoadingStates((prev) => ({ ...prev, [category]: true }))

    try {
      const response = await fetch("/api/generate-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, modelId }),
      })

      if (!response.ok) throw new Error("Failed to generate prediction")

      const data = await response.json()
      setPredictions((prev) => ({ ...prev, [category]: data.predictions }))
    } catch (error) {
      console.error("Error generating prediction:", error)
    } finally {
      setLoadingStates((prev) => ({ ...prev, [category]: false }))
    }
  }

  const likes = ["2.2k", "11k", "4.2k", "1k"]

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 px-4">
      {categories.map((config, index) => (
        <PredictionCard
          key={config.category}
          category={config.category}
          categoryColor={config.categoryColor}
          model={config.model}
          modelVersion={config.modelVersion}
          date="oct 18"
          predictions={predictions[config.category]}
          likesCount={0}
          isLoading={loadingStates[config.category]}
        />
      ))}
    </div>
  )
}
