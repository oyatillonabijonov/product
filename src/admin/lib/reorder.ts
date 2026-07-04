/**
 * Massivning `from` indeksidagi elementni `to` indeksiga ko'chiradi.
 * Immutable — har doim yangi massiv qaytaradi. Chegaradan tashqari indeks
 * yoki `from === to` bo'lsa o'zgarmagan nusxa qaytaradi.
 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  if (
    from === to ||
    from < 0 || from >= arr.length ||
    to < 0 || to >= arr.length
  ) {
    return copy;
  }
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
