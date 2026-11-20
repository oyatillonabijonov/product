import AdminApp from '../../src/admin/AdminApp';
import adminCss from '../admin.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: adminCss }];
}

export function meta() {
  return [{ title: 'Admin — ProDuct' }, { name: 'robots', content: 'noindex' }];
}

export default function AdminRoute() {
  return <AdminApp />;
}
