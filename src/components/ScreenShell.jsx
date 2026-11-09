import { CaretLeft } from '@phosphor-icons/react';

/**
 * Écran plein cadre : carte en haut, feuille blanche en bas (arrêt,
 * itinéraire, ligne). `map` est le contenu de la carte.
 */
export default function ScreenShell({ map, onBack, children, label }) {
  return (
    <div className="screen" role="dialog" aria-label={label}>
      <div className="screen-map">
        {map}
        <button type="button" className="screen-back" onClick={onBack} aria-label="Retour">
          <CaretLeft size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <section className="screen-sheet">
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </section>
    </div>
  );
}
