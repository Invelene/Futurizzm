import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Models - Futurizzm",
  description:
    "See how top AI models — Grok, Claude, GPT & Gemini — perform at predicting the future every day for the next 100 years.",
  openGraph: {
    title: "AI Models - Futurizzm",
    description:
      "See how top AI models — Grok, Claude, GPT & Gemini — perform at predicting the future every day for the next 100 years.",
    url: "https://futurizzm.com/models",
    siteName: "Futurizzm",
    images: [
      {
        url: "/Oracle.png",
        width: 1200,
        height: 630,
        alt: "Agentic AI Oracle – Futurizzm",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Models - Futurizzm",
    description:
      "See how top AI models — Grok, Claude, GPT & Gemini — perform at predicting the future every day for the next 100 years.",
    images: ["/Oracle.png"],
  },
};

export default function ModelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
