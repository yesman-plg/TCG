import { useMemo, useState } from 'react';
import { CaretRight, CheckCircle } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { activeDisruptionsByLine } from '../utils/disruptions';
import { naturalCompare, categoryRank } from '../utils/sort';
import { classifyDisruption } from '../utils/traffic';
import AlertList from './AlertList';
import LineBadge from './LineBadge';
import Modal from './Modal';

// Seules les lignes urbaines "SEM" ont des arrêts recherchables dans l'app :
// sans ce filtre, le trafic serait noyé sous ~250 lignes scolaires/interurbaines.
const APP_AGENCY = 'SEM';

function AlertCard({ entry, featured, onOpen }) {
  const { status, remainingLabel, progress, periodLabel } = entry.info;
  return (
    <li>
      <button
        type="button"
        className={featured ? 'alert-card featured' : 'alert-card'}
        onClick={() => onOpen(entry)}
      >
        <span className="alert-card-head">
          <LineBadge shortName={entry.shortName} color={entry.color} textColor={entry.textColor} size="lg" />
          <span className="alert-card-title">
            <strong>{entry.alert.titre}</strong>
            <small>{periodLabel}</small>
          </span>
          <span className={status === 'ongoing' ? 'pill warn' : 'pill'}>
            {status === 'ongoing' ? 'En cours' : 'À venir'}
          </span>
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </span>
        {featured && status === 'ongoing' && progress != null && (
          <span className="alert-progress">
            <span className="alert-progress-bar">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
            <span className="alert-progress-label">{remainingLabel}</span>
          </span>
        )}
      </button>
    </li>
  );
}

/** Onglet Trafic : perturbations de mes lignes d'abord, puis de tout le réseau. */
export default function TrafficTab() {
  const { disruptions, routesById, favorites, favoriteLineIds } = useApp();
  const [scope, setScope] = useState(null); // null = choix automatique
  const [open, setOpen] = useState(null);

  const myLineIds = useMemo(
    () => new Set([...favorites.map((f) => f.routeId), ...favoriteLineIds]),
    [favorites, favoriteLineIds],
  );

  const entries = useMemo(() => {
    if (!disruptions || !routesById) return null;
    const now = new Date();
    const list = [];
    for (const [routeId, alerts] of activeDisruptionsByLine(disruptions)) {
      if (!routeId.startsWith(`${APP_AGENCY}:`)) continue;
      const route = routesById.get(routeId);
      if (!route) continue;
      for (const alert of alerts) {
        list.push({
          key: `${routeId}-${alert.code}`,
          routeId,
          alert,
          shortName: route.shortName,
          mode: route.mode,
          color: route.color,
          textColor: route.textColor,
          info: classifyDisruption(alert, now),
        });
      }
    }
    list.sort((a, b) => {
      if (a.info.status !== b.info.status) return a.info.status === 'ongoing' ? -1 : 1;
      const cat = categoryRank(a.mode, a.shortName) - categoryRank(b.mode, b.shortName);
      return cat !== 0 ? cat : naturalCompare(a.shortName, b.shortName);
    });
    return list;
  }, [disruptions, routesById]);

  const mine = entries?.filter((e) => myLineIds.has(e.routeId)) ?? [];
  const effectiveScope = scope ?? (myLineIds.size > 0 ? 'mine' : 'all');
  const shown = effectiveScope === 'mine' ? mine : entries ?? [];
  const ongoing = shown.filter((e) => e.info.status === 'ongoing');
  const upcoming = shown.filter((e) => e.info.status === 'upcoming');
  const openEntries = open ? entries?.filter((e) => e.routeId === open.routeId) : null;

  return (
    <main className="tab-screen">
      <header className="page-head">
        <h1 className="page-title">Trafic</h1>
      </header>

      <div className="segmented" role="tablist" aria-label="Périmètre">
        <button
          type="button"
          role="tab"
          aria-selected={effectiveScope === 'mine'}
          className={effectiveScope === 'mine' ? 'active' : ''}
          onClick={() => setScope('mine')}
        >
          Mes lignes{entries ? ` · ${mine.length}` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={effectiveScope === 'all'}
          className={effectiveScope === 'all' ? 'active' : ''}
          onClick={() => setScope('all')}
        >
          Tout le réseau{entries ? ` · ${entries.length}` : ''}
        </button>
      </div>

      {!entries && <p className="muted">Chargement des infos trafic…</p>}

      {entries && effectiveScope === 'mine' && myLineIds.size === 0 && (
        <p className="hint">Ajoutez des favoris ou suivez des lignes (étoile) pour voir ici celles qui vous concernent.</p>
      )}

      {entries && ongoing.length > 0 && (
        <section aria-label="Perturbations en cours">
          <h2 className="eyebrow warn">
            {effectiveScope === 'mine' ? 'PERTURBÉ SUR VOS LIGNES' : 'PERTURBATIONS EN COURS'}
          </h2>
          <ul className="stack-list">
            {ongoing.map((e) => (
              <AlertCard key={e.key} entry={e} featured onOpen={setOpen} />
            ))}
          </ul>
        </section>
      )}

      {entries && upcoming.length > 0 && (
        <section aria-label="Perturbations à venir">
          <h2 className="eyebrow">À VENIR</h2>
          <ul className="stack-list">
            {upcoming.map((e) => (
              <AlertCard key={e.key} entry={e} onOpen={setOpen} />
            ))}
          </ul>
        </section>
      )}

      {entries && shown.length === 0 && (myLineIds.size > 0 || effectiveScope === 'all') && (
        <p className="all-clear">
          <CheckCircle size={20} weight="fill" aria-hidden="true" />
          {effectiveScope === 'mine'
            ? 'Aucune perturbation sur vos lignes.'
            : 'Aucune perturbation en cours ou annoncée sur le réseau.'}
        </p>
      )}

      {entries && effectiveScope === 'mine' && shown.length > 0 && (
        <p className="all-clear">
          <CheckCircle size={20} weight="fill" aria-hidden="true" />
          Vos autres lignes ne signalent aucune perturbation.
        </p>
      )}

      {openEntries && openEntries.length > 0 && (
        <Modal title={`Alertes — ligne ${openEntries[0].shortName}`} onClose={() => setOpen(null)}>
          <AlertList alerts={openEntries.map((e) => e.alert)} />
        </Modal>
      )}
    </main>
  );
}
