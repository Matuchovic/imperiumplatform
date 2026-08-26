import type { Metadata, Viewport } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/pwa/Register";

/* Tři role písma:
   Outfit        — display, nese identitu značky
   Inter         — běžný text a UI
   JetBrains Mono — čísla, kurzy, ID tiketů (v sázkařství je číslo obsah) */
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
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
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
