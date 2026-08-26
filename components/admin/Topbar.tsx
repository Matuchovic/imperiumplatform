import LogoutButton from "@/components/dashboard/LogoutButton";
import { ROLE_LABEL, ROLE_BARVA, type Role } from "./nav";

export default function Topbar({
  name,
  role,
  alerts,
}: {
  name: string;
  role: Role;
  alerts: number;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="adm-top">
      <label className="adm-search">
        <i className="ti ti-search" aria-hidden="true" />
        <input type="search" placeholder="Hledat klienta, tip, platbu…" aria-label="Hledat" />
      </label>

      <span className="adm-bell" aria-label={`${alerts} nepřečtených upozornění`}>
        <i className="ti ti-bell" aria-hidden="true" />
        {alerts > 0 && <span className="adm-bell__count data">{alerts}</span>}
      </span>

      <span className="adm-user">
        <span className="adm-user__pic" style={{ background: `${ROLE_BARVA[role]}22`, color: ROLE_BARVA[role] }}>{initial}</span>
        <span className="hidden sm:block">
          <span className="adm-user__name">{name}</span>
          <span className="adm-user__role" style={{ color: ROLE_BARVA[role] }}>{ROLE_LABEL[role]}</span>
        </span>
      </span>

      <LogoutButton />
    </div>
  );
}
