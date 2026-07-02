import { type RouteConfig, layout, route, index } from '@react-router/dev/routes';

export default [
  layout('routes/store.tsx', [
    index('routes/home.tsx'),
    route('category/:slug', 'routes/category.tsx'),
    route('product/:id', 'routes/product.tsx'),
    route('search', 'routes/search.tsx'),
    route(':lang', 'routes/home.tsx', { id: 'home-lang' }),
    route(':lang/category/:slug', 'routes/category.tsx', { id: 'category-lang' }),
    route(':lang/product/:id', 'routes/product.tsx', { id: 'product-lang' }),
    route(':lang/search', 'routes/search.tsx', { id: 'search-lang' }),
  ]),
  route('api/products', 'routes/api.products.tsx'),
  route('api/products/:id', 'routes/api.products.$id.tsx'),
  route('api/categories', 'routes/api.categories.tsx'),
  route('api/settings', 'routes/api.settings.tsx'),
  route('images/*', 'routes/images.$.tsx'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
