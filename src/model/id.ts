/** Korte unieke id; werkt ook waar crypto.randomUUID ontbreekt (oudere iOS in http-context). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 16);
}
