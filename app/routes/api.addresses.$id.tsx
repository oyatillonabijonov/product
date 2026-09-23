import type { Route } from './+types/api.addresses.$id';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { deleteAddress, loadAddresses, setDefaultAddress } from '../../functions/lib/db';

// DELETE — o'chirish, PATCH — asosiy qilib belgilash. Ikkalasida ham `customer_id`
// SQL shartida, ya'ni begona manzilga tegib bo'lmaydi.
export async function action({ request, params, context }: Route.ActionArgs) {
  const env = context.env;
  const customerId = await currentCustomerId(request, env);
  if (!customerId) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'bad_request' }, { status: 400 });

  if (request.method === 'DELETE') await deleteAddress(env, customerId, id);
  else if (request.method === 'PATCH') await setDefaultAddress(env, customerId, id);
  else return Response.json({ error: 'method_not_allowed' }, { status: 405 });

  return Response.json({ addresses: await loadAddresses(env, customerId) });
}
