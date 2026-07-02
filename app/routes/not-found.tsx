import { Link } from 'react-router';

export function meta() {
  return [{ title: 'Sahifa topilmadi — Taqsit Store' }];
}

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-[40px] font-semibold">404</h1>
      <p className="text-[#6E6E73]">Sahifa topilmadi.</p>
      <Link to="/" className="px-6 py-3 bg-[#0071E3] text-white font-semibold rounded-full">Bosh sahifa</Link>
    </div>
  );
}
