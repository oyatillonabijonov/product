import AdminApp from '../../src/admin/AdminApp';

export function meta() {
  return [{ title: 'Admin — ProDuct' }, { name: 'robots', content: 'noindex' }];
}

export default function AdminRoute() {
  return <AdminApp />;
}
