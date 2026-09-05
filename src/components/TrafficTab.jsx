import { useMemo, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { useDisruptions } from '../hooks/useDisruptions';
import { useRoutes } from '../hooks/useRoutes';
import { activeDisruptionsByLine } from '../utils/disruptions';
import { naturalCompare, categoryRank } from '../utils/sort';
import Modal from './Modal';

// /index/routes couvre une dizaine de réseaux (SEM, TPV, C38, MCO...) mais
// l'app n'affiche en pratique que les lignes urbaines "SEM" (celles qui
// desservent les arrêts recherchables) : sans ce filtre, l'onglet Trafic se
// retrouve noyé sous ~250 lignes scolaires/interurbaines hors périmètre.
const APP_AGENCY = 'SEM';

/**
 * Vue d'ensemble des perturbations actives, groupées par ligne, pour le
 * réseau urbain couvert par l'app (pas seulement l'arrêt qu'on regarde).
 */
export default function TrafficTab() {
  const { disruptions, error } = useDisruptions();
  const { routesById } = useRoutes();
  const [openRouteId, setOpenRouteId] = useState(null);

  const lines = useMemo(() => {
    if (!disruptions || !routesById) return null;
    const grouped = activeDisruptionsByLine(disruptions);
    const list = [];
    for (const [routeId, alerts] of grouped) {
      if (!routeId.startsWith(`${APP_AGENCY}:`)) continue; // hors périmètre de l'app
      const route = routesById.get(routeId);
      if (!route) continue;
      list.push({ routeId, alerts, shortName: route.shortName, mode: route.mode, color: route.color, textColor: route.textColor });
    }
    list.sort((a, b) => {
      const cat = categoryRank(a.mode, a.shortName) - categoryRank(b.mode, b.shortName);
      return cat !== 0 ? cat : naturalCompare(a.shortName, b.shortName);
    });
    return list;
  }, [disruptions, routesById]);

  const openLine = lines?.find((l) => l.routeId === openRouteId);

  if (error) {
    return (
      <p className="error">
        <Warning size={18} aria-hidden="true" />
        Impossible de charger les infos trafic.
      </p>
    );
  }

  if (!lines) {
    return <p className="muted">Chargement des infos trafic…</p>;
  }

  if (lines.length === 0) {
    return <p className="muted">Aucune perturbation en cours ou annoncée sur le réseau.</p>;
  }

  return (
    <>
      <ul className="traffic-list">
        {lines.map((l) => (
          <li key={l.routeId}>
            <button type="button" className="traffic-item" onClick={() => setOpenRouteId(l.routeId)}>
              <span
                className="line-badge"
                style={l.color ? { background: `#${l.color}`, color: `#${l.textColor}` } : undefined}
              >
                {l.shortName}
              </span>
              <span className="traffic-item-count">
                {l.alerts.length} alerte{l.alerts.length > 1 ? 's' : ''}
              </span>
              <Warning size={16} weight="fill" className="traffic-item-icon" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {openLine && (
        <Modal title={`Alertes — ligne ${openLine.shortName}`} onClose={() => setOpenRouteId(null)}>
          <ul className="alert-detail-list">
            {openLine.alerts.map((d) => (
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
        </Modal>
      )}
    </>
  );
}
