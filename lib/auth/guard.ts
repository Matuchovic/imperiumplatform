import { cache } from "react";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

import { jeSprava, type Role } from "@/components/admin/nav";

export type { Role };

/**
 * Role se čte ze serveru, ne z klienta. Kdyby o ní rozhodoval prohlížeč,
 * stačilo by přepsat jeden request a autorizace by byla k ničemu.
 */
export const roleOf = cache(async function roleOf(): Promise<{ id: string; role: Role } | null> {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  return { id: user.id, role: (data?.role ?? "klient") as Role };
});

/** Správce = CEO nebo vývojář. Jen ti smí měnit role a nastavení. */
export async function requireAdmin() {
  const me = await roleOf();
  if (!me || !jeSprava(me.role)) return null;
  return me;
}
