import type { Metadata, Viewport } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBoot from "@/components/pwa/Register";

/* Tři role písma:
   Outfit        — display, nese identitu značky
   Inter         — běžný text a UI
   JetBrains Mono — čísla, kurzy, ID tiketů (v sázkařství je číslo obsah) */
/* Bez uvedení weight sáhne next/font po variabilní verzi: jeden soubor
   místo čtyř na každou podmnožinu znaků. Ze šestnácti souborů písem
   je rázem šest. */
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
  // Mono nese jen čísla a popisky — smí dorazit až po textu.
  preload: false,
});

export const metadata: Metadata = {
  title: "BETIMPERIUM — přihlášení",
  description: "Přístup do systému sázkového poradenství BETIMPERIUM.",
  robots: { index: false, follow: false },
  applicationName: "BETIMPERIUM",
  appleWebApp: {
    capable: true,
    title: "BETIMPERIUM",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#050706",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Přiblížení nechávám povolené — vypnout ho je bariéra pro slabozraké.
  maximumScale: 5,
  userScalable: true,
  // Obsah smí pod výřez, odsazení řeší env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${outfit.variable} ${inter.variable} ${mono.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        {/* Pozadí přihlášení je největší vykreslený prvek stránky —
            přednačtení ho stihne dřív, než se objeví formulář. */}
        <link
          rel="preload"
          as="image"
          href="/bg/office-1024.webp"
          type="image/webp"
          fetchPriority="high"
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ClientBoot />
      </body>
    </html>
  );
}
