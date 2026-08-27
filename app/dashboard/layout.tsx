import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import Shell from "@/components/admin/Shell";
import type { Efekt } from "@/lib/avatar";
import { jeSprava, type Role } from "@/components/admin/nav";
import { demoCount } from "@/lib/seed/write";
import { headers } from "next/headers";
import { zaznamenejRelaci } from "@/lib/bezpecnost/relace";

export const dynamic = "force-dynamic";

/**
 * Skořápka systému. Ověření i načtení role je tady — jedna kontrola
 * pro celou větev, na kterou se u nové stránky nedá zapomenout.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const supabase = await supabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, avatar_efekt")
    .eq("id", user.id)
    .maybeSingle<{ name: string | null; role: string | null; avatar_efekt: string | null }>();

  const name = profile?.name || (user.user_metadata?.name as string) || user.email || "";
  const role = (profile?.role ?? "klient") as Role;
  const efekt = (profile?.avatar_efekt ?? "zadny") as Efekt;

  // Proužek je vidět jen adminovi. Bez něj se na smazání ukázky
  // zapomene a jednou se smíchá se skutečnými klienty.
  // Evidence relace. Nikdy neshodí stránku — viz zaznamenejRelaci.
  await zaznamenejRelaci(user.id, await headers());

  let demo = 0;
  if (jeSprava(role)) {
    try { demo = await demoCount(); } catch { demo = 0; }
  }

  return (
    <Shell name={name} role={role} demo={demo} efekt={efekt}>
      {children}
    </Shell>
  );
}
