import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import StoreLayout from './store/StoreLayout';
import HomePage from './store/HomePage';
import CategoryPage from './store/CategoryPage';
import ProductPage from './store/ProductPage';
import SearchPage from './store/SearchPage';
import NotFoundPage from './store/NotFoundPage';
import AdminApp from './admin/AdminApp';

const router = createBrowserRouter([
  {
    path: '/',
    element: <StoreLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
  { path: '/admin/*', element: <AdminApp /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
