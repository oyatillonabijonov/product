import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-24 text-center">
      <h1 className="text-[40px] font-semibold mb-3">404</h1>
      <p className="text-[#6E6E73] mb-6">Sahifa topilmadi.</p>
      <Link to="/" className="text-[#0071E3] font-semibold">Bosh sahifaga</Link>
    </div>
  );
}
