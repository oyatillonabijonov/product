import type { InstallmentConfig } from '../data/products';
import type { Translation } from '../locales';
import type { ApiBrand } from '../../shared/types';
import type { CatalogFilters, CatalogResult } from '../../app/lib/catalog';
import CatalogView from './CatalogView';

export default function CategoryPage({
  t, title, result, config, brands, filters,
}: { t: Translation; title: string; result: CatalogResult; config: InstallmentConfig; brands: ApiBrand[]; filters: CatalogFilters }) {
  return <CatalogView t={t} title={title} result={result} config={config} brands={brands} filters={filters} />;
}
