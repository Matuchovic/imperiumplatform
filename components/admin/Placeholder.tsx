import { PageTitle } from "./PageTitle";

/**
 * Sekce, která ještě není postavená. Radši než odkaz do prázdna —
 * uživatel vidí, co tam bude, a že to není rozbité.
 */
export default function Placeholder({
  title,
  lead,
  points,
}: {
  title: string;
  lead: string;
  points: string[];
}) {
  return (
    <>
      <PageTitle title={title} lead={lead} />
      <div className="adm-panel">
        <p className="adm-panel__title">Co tu bude</p>
        <ul className="adm-todo">
          {points.map((p) => (
            <li key={p}>
              <i className="ti ti-point" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        <p className="adm-todo__note">Sekce se připravuje. Nic se tím nerozbilo.</p>
      </div>
    </>
  );
}
