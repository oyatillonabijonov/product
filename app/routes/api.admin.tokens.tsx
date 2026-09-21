import type { Route } from './+types/api.admin.tokens';
import { json } from '../../functions/lib/db';
import { ValidationError } from '../../functions/lib/validate';
import { hashToken, newToken } from '../../shared/mcp-auth';
import type { ApiAdminToken } from '../../shared/types';
import { parseBody, requireAdmin } from './api.admin.guard';

interface TokenRow {
  id: number;
  label: string;
  kind: string;
  created_at: number;
  last_used_at: number | null;
}

const rowToToken = (r: TokenRow): ApiAdminToken => ({
  id: r.id,
  label: r.label,
  kind: r.kind === 'oauth' ? 'oauth' : 'manual',
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
});

/** Nom 2–40 belgi: jurnalda va ro'yxatda shu ko'rinadi. */
function parseTokenInput(body: unknown): { label: string } {
  const o = (body ?? {}) as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (label.length < 2 || label.length > 40) throw new ValidationError('label_required');
  return { label };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  const { results } = await context.env.DB.prepare(
    'SELECT id, label, kind, created_at, last_used_at FROM admin_tokens WHERE revoked_at IS NULL ORDER BY created_at DESC',
  ).all<TokenRow>();
  return json(results.map(rowToToken));
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  const input = parseBody(await request.json().catch(() => null), parseTokenInput);
  if (input instanceof Response) return input;
  const token = newToken();
  await context.env.DB.prepare('INSERT INTO admin_tokens (label, token_hash, kind) VALUES (?, ?, ?)')
    .bind(input.label, await hashToken(token), 'manual')
    .run();
  // Token faqat shu javobda ko'rinadi — bazada hash qoladi.
  return json({ token });
}
