import type { FC } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { ContentPage } from '../ContentFields';
import SectionTabs from '../SectionTabs';

/** Kontent → Bosh sahifa: landing matnlari va rasmlari landing tartibida (spec §5). */
const ContentHome: FC = () => {
  const { t } = useTranslation('content');
  return (
    <ContentPage
      group="home"
      title={t('contentHome.title')}
      siteHref="/"
      top={<SectionTabs section="content" active="home" />}
      footer={(
        <p className="text-para text-muted">
          <Trans
            t={t}
            i18nKey="contentHome.links"
            components={{
              banners: <Link to="/admin/content/banners" className="press text-link" />,
              news: <Link to="/admin/content/news" className="press text-link" />,
              brands: <Link to="/admin/products/brands" className="press text-link" />,
            }}
          />
        </p>
      )}
    />
  );
};

export default ContentHome;
