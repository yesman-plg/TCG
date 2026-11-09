/** Détail des perturbations d'une ligne (contenu de modale). */
export default function AlertList({ alerts }) {
  return (
    <ul className="alert-detail-list">
      {alerts.map((d) => (
        <li key={d.code} className="alert-detail-item">
          <h4>{d.titre}</h4>
          {d.description && <p>{d.description}</p>}
          {d.plan && (
            <a href={d.plan} target="_blank" rel="noreferrer">
              Voir le document
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
