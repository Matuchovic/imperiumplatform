import { redirect } from "next/navigation";
import { roleOf } from "@/lib/auth/guard";
import { jeTym, type Role } from "@/components/admin/nav";
import { PageTitle } from "@/components/admin/PageTitle";
import ChatPanel from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default async function Chat() {
  const me = await roleOf();
  if (!me) redirect("/login");
  if (!jeTym(me.role as Role)) redirect("/dashboard");

  return (
    <>
      <PageTitle
        title="Týmový chat"
        lead="Interní komunikace na jednom místě. Kanály podle témat, historie dohledatelná."
      />
      <ChatPanel jaId={me.id} />
    </>
  );
}
