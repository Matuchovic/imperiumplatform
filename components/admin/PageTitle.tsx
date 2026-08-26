export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="adm-head">
      <h1 className="adm-head__title">{title}</h1>
      {lead && <p className="adm-head__lead">{lead}</p>}
    </header>
  );
}
