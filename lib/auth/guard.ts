import { currentUser, supabaseServer } from "@/lib/supabase/server";

export type Role = "client" | "manager" | "admin";

/**
 * Role se čte ze serveru, ne z klienta. Kdyby o ní rozhodoval prohlížeč,
 * stačilo by přepsat jeden request a autorizace by byla k ničemu.
 */
export async function roleOf(): Promise<{ id: string; role: Role } | null> {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  return { id: user.id, role: (data?.role ?? "client") as Role };
}

export async function requireAdmin() {
  const me = await roleOf();
  if (!me || me.role !== "admin") return null;
  return me;
}
