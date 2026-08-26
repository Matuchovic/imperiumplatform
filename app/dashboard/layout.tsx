import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import type { Role } from "@/components/admin/nav";

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
  const role = (profile?.role ?? "client") as Role;

  return (
    <div className="adm-shell">
      <Sidebar role={role} />
      <div className="adm-main">
        <Topbar name={name} role={role} alerts={12} />
        <div className="adm-body">{children}</div>
      </div>
    </div>
  );
}
