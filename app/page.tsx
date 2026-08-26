import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  redirect(session ? "/dashboard" : "/login");
}
