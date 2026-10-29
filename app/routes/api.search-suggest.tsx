import type { Route } from './+types/api.search-suggest';
import { loadSearchSuggestions } from '../lib/loaders';
import { allowSuggest } from '../../functions/lib/rate-limit';

/** Qidiruv maydoni tavsiyalari — ochiq, faqat o'qish; 2 belgidan qisqa so'rovga bo'sh ro'yxat. */
export async function loader({ request, context }: Route.LoaderArgs) {
  // Limitdan oshsa ham javob shakli o'sha — bo'sh ro'yxat (SearchBox `!r.ok`da ham `[]` oladi).
  if (!allowSuggest(context.ip || 'unknown')) return Response.json([], { status: 429 });
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  return Response.json(q.length < 2 ? [] : await loadSearchSuggestions(context.env, q));
}
