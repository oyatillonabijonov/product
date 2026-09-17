import type { FC } from 'react';
import { Link } from 'react-router';
import { ContentPage } from '../ContentFields';
import SectionTabs from '../SectionTabs';

/** Kontent → Bosh sahifa: landing matnlari va rasmlari landing tartibida (spec §5). */
const ContentHome: FC = () => (
  <ContentPage
    group="home"
    title="Saytning bosh sahifasi"
    siteHref="/"
    top={<SectionTabs section="content" active="home" />}
    footer={(
      <p className="text-para text-muted">
        Bannerlar, yangiliklar va brend logotiplari o'z bo'limlarida:{' '}
        <Link to="/admin/content/banners" className="press text-cta">Bannerlar</Link>
        {' · '}
        <Link to="/admin/content/news" className="press text-cta">Yangiliklar</Link>
        {' · '}
        <Link to="/admin/products/brands" className="press text-cta">Brendlar</Link>
      </p>
    )}
  />
);

export default ContentHome;
