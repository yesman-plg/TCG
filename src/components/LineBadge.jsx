/** Pastille de ligne aux couleurs officielles (numéro ou lettre). */
export default function LineBadge({ shortName, color, textColor, size = 'md', alert = false }) {
  const style = color
    ? { background: `#${color}`, color: `#${textColor || 'FFFFFF'}` }
    : undefined;
  return (
    <span className={`line-badge line-badge-${size}`} style={style}>
      {shortName || '?'}
      {alert && <span className="line-badge-alert" aria-hidden="true" />}
    </span>
  );
}
