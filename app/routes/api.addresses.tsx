import type { Route } from './+types/api.addresses';
import { parseAddressInput, ValidationError } from '../../functions/lib/validate';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { createAddress, loadAddresses } from '../../functions/lib/db';

// Kabinet manzillari — `customer_session` bilan himoyalangan; `customerId` doim
// cookie'dan olinadi, tanadan emas (aks holda boshqaning manziliga yozib bo'lardi).
export async function loader({ request, context }: Route.LoaderArgs) {
  const id = await currentCustomerId(request, context.env);
  if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return Response.json({ addresses: await loadAddresses(context.env, id) });
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const env = context.env;
  const id = await currentCustomerId(request, env);
  if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  let input;
  try {
    input = parseAddressInput(await request.json());
  } catch (e) {
    return Response.json({ error: e instanceof ValidationError ? e.message : 'bad_request' }, { status: 400 });
  }
  try {
    await createAddress(env, id, input);
  } catch (e) {
    if (e instanceof Error && e.message === 'address_limit') {
      return Response.json({ error: 'address_limit' }, { status: 400 });
    }
    throw e;
  }
  return Response.json({ addresses: await loadAddresses(env, id) });
}
