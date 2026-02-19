import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://futurizzm.com"),
  title: "Futurizzm - AI predicting the future",
  description:
    "AI predicting everyday for the next 100 years of human civilization",
  openGraph: {
    title: "Futurizzm - AI predicting the future",
    description:
      "AI predicting everyday for the next 100 years of human civilization",
    url: "https://futurizzm.com",
    siteName: "Futurizzm",
    images: [
      {
        url: "/Oracle.png",
        width: 1200,
        height: 630,
        alt: "The Sentient ORB",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Futurizzm - AI predicting the future",
    description:
      "AI predicting everyday for the next 100 years of human civilization",
    images: ["/Oracle.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen bg-background"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
