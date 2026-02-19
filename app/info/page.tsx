"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";

export default function InfoPage() {
  const [showOracle, setShowOracle] = useState(false);

  // Testimonials for the carousel
  const testimonials = [
    {
      text: "You will meet Amy at the gym today, and she will likely suggest getting coffee afterwards.",
    },
    {
      text: "Ryan will drive by the house at exactly 2 pm, you might want to be outside to say Hi.",
    },
    {
      text: "Mary from work will likely pay for your groceries at the mall today.",
    },
    {
      text: "Kelvin will leave town before noon; you should not bother going to visit.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-8 py-12 flex flex-col items-center justify-center text-center relative min-h-[700px]">
        {/* VIEW 1: STANDARD ORB (Starts Visible) */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
            showOracle
              ? "-translate-x-full opacity-0 pointer-events-none"
              : "translate-x-0 opacity-100"
          }`}
        >
          {/* Glowing Orb */}
          <div className="relative inline-block animate-in zoom-in duration-1000 max-w-full">
            <img
              src="/Rizzm2.png"
              alt="The Sentient ORB"
              className="object-contain max-w-full h-auto drop-shadow-[0_0_50px_rgba(59,130,246,0.6)] animate-pulse"
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-mono glow-text mt-8 relative z-10 text-white">
            The Sentient ORB
          </h1>

          {/* Description */}
          <p className="text-muted-foreground/80 text-base md:text-xl max-w-2xl leading-relaxed mt-8 text-justify md:text-center">
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

          {/* Transition Trigger */}
          <button
            onClick={() => setShowOracle(true)}
            className="mt-12 px-6 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all rounded-full text-sm tracking-widest font-mono animate-pulse"
          >
            EXPERIMENTAL: OPENCLAW SKILL &rarr;
          </button>

          {/* Live Link */}
          <Link
            href="/"
            className="mt-6 px-6 py-2 text-cyan-400 hover:text-white text-xs uppercase tracking-widest transition-all rounded-full"
          >
            Live
          </Link>
        </div>

        {/* VIEW 2: DAILY ORACLE (Starts Hidden) */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-start pt-32 transition-all duration-700 ease-in-out ${
            showOracle
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          {/* Title - No Glow, No Experimental, 6XL, aligned top (via container justify-start pt-32) */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-mono relative z-10 text-white mb-6">
            Meet the ORB of OpenClaw
          </h1>

          {/* Description */}
          <p className="text-red-200/80 text-base md:text-xl max-w-3xl leading-relaxed mb-10 text-justify md:text-center">
            The daily-oracle skill for your openclaw agent generates insightful
            daily life predictions that you might not see coming. This skill is
            designed to run as a background process. It wakes up, analyses the
            user's digital footprint, generates a prediction, pushes the
            notification, and then terminates.
          </p>

          {/* CTA Button (Moved here) */}
          <Link
            href="https://clawhub.ai/Invelene/daily-oracle"
            target="_blank"
            className="mb-12 px-10 py-3 bg-red-600/10 text-red-500 border border-red-500/50 rounded-full font-bold tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
          >
            VIEW SKILL
          </Link>

          {/* Testimonial Carousel - Uniform Cards */}
          <div
            className="w-full relative overflow-hidden h-[100px] mb-8"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            }}
          >
            <div className="flex animate-infinite-scroll hover:pause gap-8 items-center h-full w-max">
              {[...testimonials, ...testimonials, ...testimonials].map(
                (item, i) => (
                  <div
                    key={i}
                    className="w-[350px] md:w-[450px] h-full flex items-center justify-center p-4 rounded-xl bg-black/20 backdrop-blur-sm text-white/70 text-xs md:text-sm font-light shrink-0 border border-white/5"
                  >
                    "{item.text}"
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Back Trigger */}
          <button
            onClick={() => setShowOracle(false)}
            className="mt-8 px-6 py-2 text-cyan-400 hover:text-white text-xs uppercase tracking-widest transition-all rounded-full"
          >
            &larr; Return to Sentient ORB
          </button>
        </div>

        {/* CSS for Infinite Scroll (Inline for simplicity) */}
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .animate-infinite-scroll {
            animation: scroll 60s linear infinite;
          }
          .animate-infinite-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>
      </main>

      <Footer />
    </div>
  );
}
