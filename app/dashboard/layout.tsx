import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/dashboard/Sidebar";
import LogoutButton from "@/components/dashboard/LogoutButton";

export const dynamic = "force-dynamic";

/**
 * Skořápka systému. Ověření je tady, ne v jednotlivých stránkách —
 * jedna kontrola pro celou větev, na kterou se nedá zapomenout.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, plan")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.name || (user.user_metadata?.name as string) || user.email || "";
  const plan = profile?.plan ?? "start";

  return (
    <div className="relative min-h-dvh">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(110% 70% at 15% -10%, #0a1712 0%, transparent 55%), #050706",
        }}
      />

      <div className="relative z-10 flex min-h-dvh">
        <Sidebar plan={plan} />

        <div className="min-w-0 flex-1">
          <div
            className="flex items-center justify-end gap-3 py-4 pl-24 pr-5 sm:px-8 lg:pl-8"
            style={{ borderBottom: "1px solid rgba(126,240,168,0.07)" }}
          >
            <span className="hidden text-[13px] text-ash sm:inline">{name}</span>
            <LogoutButton />
          </div>

          <main className="p-5 sm:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
