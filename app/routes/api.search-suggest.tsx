import type { Route } from './+types/api.search-suggest';
import { loadSearchSuggestions } from '../lib/loaders';

/** Qidiruv maydoni tavsiyalari — ochiq, faqat o'qish; 2 belgidan qisqa so'rovga bo'sh ro'yxat. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  return Response.json(q.length < 2 ? [] : await loadSearchSuggestions(context.env, q));
}
