import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/50 py-6 mt-auto bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6 flex flex-col items-center gap-2 text-center">
        <p className="text-xs md:text-sm text-muted-foreground font-mono tracking-wide">
          FUTURIZZM © 2026
        </p>
        <p className="text-[10px] md:text-xs text-muted-foreground/60 font-mono">
          AI CAN MAKE MISTAKES. PREDICTIONS ARE FOR ENTERTAINMENT PURPOSES ONLY.
        </p>
      </div>
    </footer>
  );
}
