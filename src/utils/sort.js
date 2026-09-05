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

// Les lignes Chrono (C1, C2… C14) sont les bus structurants du réseau M :
// elles doivent apparaître juste après les trams, avant les autres bus/cars.
const CHRONO_LINE = /^C\d/;

/**
 * Catégorie d'affichage d'une ligne : 0 = tram, 1 = bus Chrono (C1, C2…),
 * 2 = tout le reste (bus de proximité, lignes interurbaines, scolaires…).
 */
export function categoryRank(mode, shortName) {
  if (mode === 'TRAM') return 0;
  if (CHRONO_LINE.test(shortName || '')) return 1;
  return 2;
}
