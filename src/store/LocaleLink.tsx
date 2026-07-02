import { Link, useOutletContext, type LinkProps } from 'react-router';
import { localizedPath } from '../../app/lib/i18n';
import type { StoreContext } from './StoreLayout';

export default function LocaleLink({ to, ...rest }: LinkProps & { to: string }) {
  const { locale } = useOutletContext<StoreContext>();
  return <Link to={localizedPath(locale, to)} {...rest} />;
}
