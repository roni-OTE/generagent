import type { Metadata } from "next";
import { IBM_Plex_Sans_Hebrew, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const heebo = IBM_Plex_Sans_Hebrew({
  weight: ["400", "500", "600", "700"],
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GenerAgent · איזה סוכן AI אתה צריך?",
  description:
    "ראיון אדפטיבי בעברית מאפיין את הסוכן הנכון עבורך, ומכין חבילת התקנה מוכנה ל-Claude Code או Codex CLI.",
  metadataBase: new URL("https://generagent.io"),
  openGraph: {
    title: "GenerAgent",
    description:
      "ראיון אדפטיבי שמאפיין סוכן AI אישי. חבילת התקנה מוכנה ל-Claude Code/Codex.",
    type: "website",
    locale: "he_IL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
