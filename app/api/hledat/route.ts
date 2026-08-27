import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

/**
 * Hledání napříč systémem.
 *
 * Jeden dotaz do několika tabulek najednou. Každá skupina má strop,
 * protože seznam padesáti klientů v rozbalovacím okně nikdo nečte —
 * pět nejlepších a odkaz do sekce je užitečnější.
 */
export async function GET(req: Request) {
  const me = await roleOf();
  if (!me) return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  // Pod dva znaky by dotaz vrátil skoro všechno a nepomohl.
  if (q.length < 2) return NextResponse.json({ skupiny: [] });

  const db = serviceClient();
  const vzor = `%${q}%`;
  const tym = jeTym(me.role as Role);

  const [klienti, kontakty, faktury, ukoly, vozidla] = await Promise.all([
    tym
      ? db.from("profiles").select("id, name, role").eq("role", "klient")
          .ilike("name", vzor).limit(5)
      : Promise.resolve({ data: [] }),
    tym
      ? db.from("kontakty").select("id, company_name, ico, city")
          .is("smazano_at", null).ilike("company_name", vzor).limit(5)
      : Promise.resolve({ data: [] }),
    ["ceo", "vyvojar", "ucetni", "manazer"].includes(me.role)
      ? db.from("faktury").select("id, cislo, odberatel, castka, stav")
          .or(`cislo.ilike.${vzor},odberatel.ilike.${vzor}`).limit(5)
      : Promise.resolve({ data: [] }),
    tym
      ? db.from("ukoly").select("id, nazev, termin, hotovo")
          .ilike("nazev", vzor).limit(5)
      : Promise.resolve({ data: [] }),
    tym
      ? db.from("vozidla").select("id, spz, znacka, model")
          .or(`spz.ilike.${vzor},znacka.ilike.${vzor}`).limit(4)
      : Promise.resolve({ data: [] }),
  ]);

  type Nalez = { id: string; nazev: string; popis?: string; href: string };
  const skupiny: { nazev: string; ikona: string; nalezy: Nalez[] }[] = [];

  const pridej = (nazev: string, ikona: string, nalezy: Nalez[]) => {
    if (nalezy.length) skupiny.push({ nazev, ikona, nalezy });
  };

  pridej("Klienti", "users", (klienti.data ?? []).map((k) => ({
    id: `k-${k.id}`, nazev: k.name as string, href: "/dashboard/klienti",
  })));

  pridej("Kontakty", "address-book", (kontakty.data ?? []).map((k) => ({
    id: `c-${k.id}`,
    nazev: k.company_name as string,
    popis: [k.ico, k.city].filter(Boolean).join(" · "),
    href: "/dashboard/kontakty",
  })));

  pridej("Faktury", "file-invoice", (faktury.data ?? []).map((f) => ({
    id: `f-${f.id}`,
    nazev: `${f.cislo} — ${f.odberatel}`,
    popis: `${Math.round(Number(f.castka)).toLocaleString("cs-CZ")} Kč`,
    href: "/dashboard/faktury",
  })));

  pridej("Úkoly", "checkbox", (ukoly.data ?? []).map((u) => ({
    id: `u-${u.id}`,
    nazev: u.nazev as string,
    popis: u.hotovo ? "hotovo" : (u.termin as string | null) ?? undefined,
    href: "/dashboard/ukoly",
  })));

  pridej("Vozidla", "car", (vozidla.data ?? []).map((v) => ({
    id: `v-${v.id}`,
    nazev: `${v.spz} — ${v.znacka} ${v.model ?? ""}`.trim(),
    href: "/dashboard/vozidla",
  })));

  return NextResponse.json({ skupiny });
}
