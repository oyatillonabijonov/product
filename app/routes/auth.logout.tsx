import { redirect } from 'react-router';
import type { Route } from './+types/auth.logout';
import { clearedCustomerCookie } from '../../functions/lib/customer-auth';
import { isSecureRequest } from '../../functions/lib/auth';

export async function loader({ request }: Route.LoaderArgs) {
  return redirect('/', { headers: { 'set-cookie': clearedCustomerCookie(isSecureRequest(request)) } });
}
