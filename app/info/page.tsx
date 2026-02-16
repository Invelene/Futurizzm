"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";

export default function InfoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-8 py-12 flex flex-col items-center justify-center text-center gap-8">
        {/* Glowing Orb */}
        {/* Glowing Orb */}
        <div className="relative inline-block animate-in zoom-in duration-1000 max-w-full">
          <img
            src="/Rizzm2.png"
            alt="The Sentient ORB"
            className="object-contain max-w-full h-auto drop-shadow-[0_0_50px_rgba(59,130,246,0.6)] animate-pulse"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-mono glow-text mt-[-20px] relative z-10">
          The Sentient ORB
        </h1>

        {/* Description (User's specific text) */}
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
          Predictions are automatically generated at 5:00 AM EST every day.
          Trending topics retrieved each day are currently limited to the US,
          but will be expanded to other countries in the future.
        </p>

        {/* Contact Section */}
        <div className="flex flex-col items-center gap-2 mt-4 text-muted-foreground">
          <Link
            href="https://x.com/_invelene"
            target="_blank"
            className="text-blue-400 underline hover:text-blue-300 transition-colors font-mono text-lg"
          >
            Contact Me
          </Link>
          <p className="text-sm">on X/twitter for more info</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
