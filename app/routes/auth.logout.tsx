import { redirect } from 'react-router';
import { clearedCustomerCookie } from '../../functions/lib/customer-auth';

export async function loader() {
  return redirect('/', { headers: { 'set-cookie': clearedCustomerCookie() } });
}
