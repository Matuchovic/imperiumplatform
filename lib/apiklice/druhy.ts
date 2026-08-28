/**
 * Druhy podezřelého chování.
 *
 * Oddělené od `podezreni.ts`, protože ten sahá na databázi
 * a prohlížeč ho vzít nesmí. Tohle jsou jen názvy.
 */

export type DruhPodezreni = "naraz" | "chyby" | "nova_ip" | "v_noci";

export const DRUHY: Record<DruhPodezreni, { nazev: string; popis: string }> = {
  naraz: { nazev: "Prudký nárůst", popis: "Výrazně víc volání než obvykle." },
  chyby: { nazev: "Řada chyb", popis: "Někdo zkouší, co klíč pustí." },
  nova_ip: { nazev: "Nová adresa", popis: "Volání z adresy, ze které klíč nikdy nešel." },
  v_noci: { nazev: "Provoz v noci", popis: "Klíč jinak v tuhle dobu nepracuje." },
};
