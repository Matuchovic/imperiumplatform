import { supabaseServer } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/dashboard/ui";

export default async function Nastaveni() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, plan")
    .eq("id", user?.id ?? "")
    .maybeSingle<{ name: string | null; plan: string | null }>();
  const email = user?.email ?? "";

  return (
    <>
      <PageHeader eyebrow="Účet" title="Nastavení" />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <p className="eyebrow mb-4">Profil</p>
          {[
            ["Jméno", profile?.name ?? ""],
            ["E-mail", email],
            ["Plán", profile?.plan ?? ""],
            ["Členem od", "1. 3. 2026"],
          ].map(([k, v], i) => (
            <div
              key={k}
              className="flex items-baseline justify-between py-2.5"
              style={i > 0 ? { borderTop: "1px solid rgba(126,240,168,0.07)" } : undefined}
            >
              <span className="text-[13px] text-ash">{k}</span>
              <span className="text-[13.5px] text-chalk">{v}</span>
            </div>
          ))}
        </Card>

        <Card className="p-5">
          <p className="eyebrow mb-4">Zabezpečení</p>
          <button
            className="w-full rounded-lg py-2.5 text-[13.5px] text-ash transition-colors hover:text-chalk"
            style={{ border: "1px solid rgba(126,240,168,0.14)", background: "rgba(255,255,255,0.02)" }}
          >
            Změnit heslo
          </button>
          <button
            className="mt-2.5 w-full rounded-lg py-2.5 text-[13.5px] text-ash transition-colors hover:text-chalk"
            style={{ border: "1px solid rgba(126,240,168,0.14)", background: "rgba(255,255,255,0.02)" }}
          >
            Zapnout dvoufázové ověření
          </button>
          <p className="mt-4 text-[11.5px] leading-relaxed text-ash-2">
            Dvoufázové ověření doporučujeme zapnout — k účtu je navázaná platba.
          </p>
        </Card>
      </div>

      <Card className="mb-4 p-5" >
        <p className="eyebrow mb-1" style={{ color: "#ffc94a" }}>Zodpovědné sázení</p>
        <p className="mb-4 text-[13px] leading-relaxed text-ash">
          Limity si nastavuješ sám a platí okamžitě. Zvýšení se projeví až po sedmi dnech,
          snížení hned — schválně, aby se nedaly obejít ve chvíli, kdy se ti nedaří.
        </p>

        {[
          ["Týdenní limit sázek", "6 000 Kč"],
          ["Měsíční limit ztráty", "8 000 Kč"],
          ["Připomenutí času", "po 60 minutách"],
        ].map(([k, v], i) => (
          <div
            key={k}
            className="flex items-center justify-between gap-4 py-3"
            style={i > 0 ? { borderTop: "1px solid rgba(126,240,168,0.07)" } : undefined}
          >
            <span className="text-[14px] text-chalk">{k}</span>
            <span className="data text-[13.5px] text-ash">{v}</span>
          </div>
        ))}

        <button
          className="mt-4 w-full rounded-lg py-2.5 text-[13.5px] transition-colors"
          style={{ border: "1px solid rgba(255,201,74,0.3)", background: "rgba(255,201,74,0.06)", color: "#ffc94a" }}
        >
          Pozastavit účet na 30 dní
        </button>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ash-2">
          Když sázení přestává být zábava, pomoc je zdarma a anonymní. Kontakty najdeš
          na stránkách Národní linky pro odvykání.
        </p>
      </Card>

      <Card className="p-5">
        <p className="eyebrow mb-1" style={{ color: "#ff6b6b" }}>Nebezpečná zóna</p>
        <p className="mb-4 text-[13px] text-ash">Zrušení členství ukončí doručování tiketů na konci zaplaceného období.</p>
        <button
          className="rounded-lg px-4 py-2.5 text-[13.5px] transition-colors"
          style={{ border: "1px solid rgba(255,107,107,0.3)", background: "rgba(255,107,107,0.06)", color: "#ff6b6b" }}
        >
          Zrušit členství
        </button>
      </Card>
    </>
  );
}
