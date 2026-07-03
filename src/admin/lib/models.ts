import type { ApiDeviceModel, ApiSpec } from '../../../shared/types';

export function modelToSpecs(m: ApiDeviceModel): ApiSpec[] {
  const pairs: [string, string][] = [
    ['Protsessor', m.chip], ['Operativ xotira', m.ram], ['Kamera', m.camera], ['Displey', m.display],
  ];
  return pairs.filter(([, v]) => v.trim() !== '').map(([label, value]) => ({ label, value }));
}

export function mergeSpecs(current: ApiSpec[], incoming: ApiSpec[]): ApiSpec[] {
  const incomingByLabel = new Map(incoming.map((s) => [s.label.toLowerCase(), s]));
  const merged = current.map((s) => incomingByLabel.get(s.label.toLowerCase()) ?? s);
  const currentLabels = new Set(current.map((s) => s.label.toLowerCase()));
  return [...merged, ...incoming.filter((s) => !currentLabels.has(s.label.toLowerCase()))];
}

export function filterModels(models: ApiDeviceModel[], query: string, limit = 50): ApiDeviceModel[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matched = tokens.length === 0
    ? models
    : models.filter((m) => { const n = m.name.toLowerCase(); return tokens.every((t) => n.includes(t)); });
  return matched.slice(0, limit);
}
