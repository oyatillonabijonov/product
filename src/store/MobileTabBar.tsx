import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { SPRING_UI } from '../lib/motion';
import { Home, TextSearch, Heart, ShoppingCart, User } from 'lucide-react';
import { BotAvatar } from 'bot-avatars';
import type { Avatar } from '../../shared/avatar';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../locales';
import { localizedPath, stripLocale, type Locale } from '../../app/lib/i18n';
import { useCart } from './CartContext';
import { useFavorites } from './FavoritesContext';

/**
 * Mobil pastki navigatsiya (`lg`gacha) — ilova tab bar'i naqshi: Bosh sahifa · Katalog ·
 * Sevimlilar · Savat · Profil. Header'ning 1-qatoridagi ikonkalar `lg`gacha shu yerga ko'chgan —
 * bosh barmoq pastda yetadi. Joriy bo'lim `text-primary`, qolgani `text-muted-2`.
 * `StoreLayout` sahifa ostiga shu balandlikda bo'sh joy qoldiradi, `ContactFab` va cookie
 * banneri undan yuqorida turadi. iPhone'ning pastki "home" chizig'i uchun safe-area.
 * `hidden` — bosh sahifa hero'si ekranda turganda panel pastga yashirinadi (StoreLayout).
 */
const MobileTabBar: FC<{ t: Translation; locale: Locale; signedIn: boolean; avatar: Avatar | null; unread: number; hidden?: boolean }> = ({ t, locale, signedIn, avatar, unread, hidden = false }) => {
  const { pathname } = useLocation();
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const path = stripLocale(pathname);

  const tabs: { to: string; label: string; Icon: LucideIcon; active: boolean; badge?: number; avatar?: Avatar; dot?: boolean }[] = [
    { to: '/', label: t.breadcrumbHome, Icon: Home, active: path === '/' },
    { to: '/katalog', label: t.navCatalog, Icon: TextSearch, active: path.startsWith('/katalog') || path.startsWith('/category') },
    { to: '/sevimlilar', label: t.accountTabFavorites, Icon: Heart, active: path === '/sevimlilar', badge: favCount },
    { to: '/savat', label: t.cartTitle, Icon: ShoppingCart, active: path === '/savat', badge: count },
    {
      to: signedIn ? '/kabinet' : '/kirish',
      label: t.navProfile,
      Icon: User,
      active: path === '/kabinet' || path === '/kirish',
      // Kirgan bo'lsa ikonka o'rniga o'z avatari — header'dagi Profil ustuni bilan bir xil.
      avatar: avatar ?? undefined,
      dot: unread > 0,
    },
  ];

  return (
    <motion.nav
      aria-label={t.navCatalog}
      aria-hidden={hidden}
      inert={hidden}
      initial={false}
      animate={{ y: hidden ? '100%' : '0%' }}
      transition={SPRING_UI}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, Icon, active, badge, avatar: tabAvatar, dot }) => (
          <li key={to}>
            <Link
              to={localizedPath(locale, to)}
              aria-current={active ? 'page' : undefined}
              className={`press flex h-16 flex-col items-center justify-center gap-1 ${active ? 'text-primary' : 'text-muted-2'}`}
            >
              <span className="relative">
                {tabAvatar
                  ? <BotAvatar type={tabAvatar.type} face={tabAvatar.face} size={26} interactive={false} />
                  : <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.6} />}
                {dot && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-sale ring-2 ring-bg" />}
                {!!badge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sale px-1 text-label font-bold leading-none text-bg">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-label leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
};

export default MobileTabBar;
