import { Link, useOutletContext, type LinkProps } from 'react-router';
import { localizedPath } from '../../app/lib/i18n';
import type { StoreContext } from './StoreLayout';

export default function LocaleLink({ to, ...rest }: LinkProps & { to: string }) {
  // Konteksti yo'q joyda (admin'dagi jonli ko'rinish) — standart til.
  const ctx = useOutletContext<StoreContext | undefined>();
  return <Link to={localizedPath(ctx?.locale ?? 'uz', to)} {...rest} />;
}
