const regionAcronyms = new Set(['DI', 'DKI']);

export function formatRegionLabel(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[A-Za-z0-9]+/g, (word) => {
      const upperWord = word.toUpperCase();
      if (regionAcronyms.has(upperWord)) return upperWord;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
}
