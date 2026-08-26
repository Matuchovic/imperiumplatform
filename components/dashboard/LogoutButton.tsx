"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="tap rounded-lg px-4 py-2.5 text-[13.5px] text-ash transition-colors hover:text-chalk disabled:opacity-50"
      style={{ border: "1px solid rgba(126,240,168,0.14)", background: "rgba(255,255,255,0.02)" }}
    >
      {busy ? "Odhlašuji…" : "Odhlásit se"}
    </button>
  );
}
