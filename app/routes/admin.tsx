import AdminApp from '../../src/admin/AdminApp';

export function meta() {
  return [{ title: 'Admin — Taqsit Store' }, { name: 'robots', content: 'noindex' }];
}

export default function AdminRoute() {
  return <AdminApp />;
}
