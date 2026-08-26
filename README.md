# BETIMPERIUM

Next.js 15 (App Router) + React 19 + Tailwind v4. Přihlášení a dashboard.

## Spuštění

```bash
npm install
cp .env.example .env.local        # a doplň AUTH_SECRET
npm run dev
```

Otevři http://localhost:3000 — kořen přesměruje na `/login` nebo `/dashboard`
podle toho, jestli existuje platná session.

**Demo účet:** `demo@bet-imperium.cz` / `imperium123`

## Struktura

```
app/
  globals.css              design tokeny + všechny animace
  layout.tsx               Outfit / Inter / JetBrains Mono
  login/page.tsx           přihlašovací obrazovka
  dashboard/page.tsx       přehled po přihlášení
  api/auth/{login,logout,me}/route.ts
components/
  background/ImperiumField.tsx   ambientní pozadí (signature prvek)
  auth/LoginForm.tsx             formulář, validace, chybové stavy
  brand/Logo.tsx
  dashboard/LogoutButton.tsx
lib/
  db.ts        demo úložiště + ověření hesla (scrypt)
  session.ts   podepsaný JWT v httpOnly cookie (jose, Edge-compatible)
middleware.ts  ochrana /dashboard, odklon přihlášených z /login
```

## Design systém

| token | hex | použití |
|---|---|---|
| ink | `#050706` | základ, černá se zeleným podtónem |
| slate | `#0C1310` | povrch panelů |
| signal | `#7EF0A8` | primární neon, CTA, zisk |
| mint | `#5EEAD4` | druhá barva gradientů |
| amber | `#FFC94A` | výhradně stav „čeká na výsledek" |
| ash | `#8FA396` | tlumený text |

Tři role písma: **Outfit** (display), **Inter** (text a UI), **JetBrains Mono**
(čísla, kurzy, ID tiketů — v sázkařství je číslo obsah, ne dekorace).

## Bezpečnost

- Heslo se ověřuje přes `scrypt` s `timingSafeEqual`.
- Session je podepsaný JWT v `httpOnly` + `sameSite=lax` cookie, v produkci `secure`.
- Odpověď na neexistující účet je stejná jako na špatné heslo — neprozrazuje,
  které e-maily jsou registrované.
- Základní rate limit (8 pokusů / 10 min / IP) je in-memory; v produkci nahraď Redisem.

## Další kroky

1. Skutečná databáze (Postgres + Drizzle) místo `lib/db.ts`.
2. Registrace, obnova hesla, ověření e-mailu.
3. Dvoufaktorové ověření pro účty s napojenou platbou.
4. Napojení Telegram bota na `/dashboard/telegram`.
