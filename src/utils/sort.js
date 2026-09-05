/** Découpe une chaîne en morceaux alternant lettres et chiffres ("C10" -> ["C", "10"]). */
function splitAlphaNum(str) {
  return str.match(/\d+|\D+/g) || [];
}

/**
 * Comparateur "naturel" : "C2" < "C10" (contrairement à l'ordre lexicographique
 * qui mettrait "C10" avant "C2"), et "A" < "B" < "C" comme attendu.
 */
export function naturalCompare(a, b) {
  const partsA = splitAlphaNum(a);
  const partsB = splitAlphaNum(b);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const chunkA = partsA[i] ?? '';
    const chunkB = partsB[i] ?? '';
    const numA = Number(chunkA);
    const numB = Number(chunkB);
    if (chunkA !== '' && chunkB !== '' && !Number.isNaN(numA) && !Number.isNaN(numB)) {
      if (numA !== numB) return numA - numB;
    } else if (chunkA !== chunkB) {
      return chunkA < chunkB ? -1 : 1;
    }
  }
  return 0;
}

const MODE_ORDER = { TRAM: 0, BUS: 1 };

/** Rang d'un mode de transport pour le tri (tram avant bus avant le reste). */
export function modeRank(mode) {
  return MODE_ORDER[mode] ?? 2;
}
