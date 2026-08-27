import type { Metadata, Viewport } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBoot from "@/components/pwa/Register";
import AktualizaceVerze from "@/components/pwa/AktualizaceVerze";
import ObnovaPoPadu from "@/components/pwa/ObnovaPoPadu";

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
  /**
   * Ikony. Apple Touch je bez průhlednosti — iOS by ji nahradil
   * černou a okraje by vypadaly ušpiněně.
   */
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/favicon-32.png",
  },
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
        {/* Ikony se vkládají až po vykreslení, aby neblokovaly první
            snímek. Přednačtení ale spustí stahování hned — jinak
            prohlížeč o souboru neví a ikony chvíli blikají. */}
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"
          crossOrigin=""
        />
      </head>
      <body className="min-h-dvh antialiased">
        <ObnovaPoPadu />
        <AktualizaceVerze />
        {children}
        <ClientBoot />
      </body>
    </html>
  );
}
