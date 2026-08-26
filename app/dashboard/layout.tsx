import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { jeSprava, type Role } from "@/components/admin/nav";
import { demoCount } from "@/lib/seed/write";

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
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle<{ name: string | null; role: string | null }>();

  const name = profile?.name || (user.user_metadata?.name as string) || user.email || "";
  const role = (profile?.role ?? "klient") as Role;

  // Proužek je vidět jen adminovi. Bez něj se na smazání ukázky
  // zapomene a jednou se smíchá se skutečnými klienty.
  let demo = 0;
  if (jeSprava(role)) {
    try { demo = await demoCount(); } catch { demo = 0; }
  }

  return (
    <div className="adm-shell">
      <Sidebar role={role} />
      <div className="adm-main">
        <Topbar name={name} role={role} alerts={0} />
        {demo > 0 && (
          <div className="demo-bar" role="status">
            <span>
              <strong>Ukázková data.</strong> V systému je {demo}{" "}
              {demo === 1 ? "ukázkový klient" : demo < 5 ? "ukázkoví klienti" : "ukázkových klientů"}.
              Před spuštěním s reálnými klienty je smaž.
            </span>
            <span className="data demo-bar__how">DELETE /api/demo/seed</span>
          </div>
        )}
        <div className="adm-body">{children}</div>
      </div>
    </div>
  );
}
