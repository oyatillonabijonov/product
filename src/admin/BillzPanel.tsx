import { useEffect, useState } from 'react';
import type { BillzSyncStatus } from '../../shared/billz';
import { getBillzStatus, runBillzSync } from './api';
import { errText } from './errText';

/** Billz sinxronizatsiya holati va qo'lda ishga tushirish (Sozlamalar). */
export default function BillzPanel() {
  const [status, setStatus] = useState(null as BillzSyncStatus | null);
  const [msg, setMsg] = useState('');

  async function load() {
    try { setStatus(await getBillzStatus()); } catch (e) { setMsg(errText(e)); }
  }
  useEffect(() => { load(); }, []);
  // Ishlayotganda 3 s da bir yangilanadi — run fon vazifasi, javob darhol qaytadi.
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [status?.running]);

  async function run() {
    setMsg('');
    try { await runBillzSync(); setMsg('Boshlandi…'); await load(); }
    catch (e) { setMsg(errText(e)); }
  }

  const last = status?.last ?? null;
  const when = last ? new Date(last.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) : null;
  const busy = !status?.configured || status.running;
  return (
    <section className="rounded-md bg-white border border-line-2 p-5">
      <h2 className="text-[20px] font-semibold text-primary">Billz sinxronizatsiyasi</h2>
      <p className="text-[13.5px] text-muted mt-0.5">Har 30 daqiqada butun katalog qayta o'qiladi; bir nomdagi Billz tovarlari saytda bitta mahsulot bo'lib, qoldig'i yig'iladi. Kerak bo'lsa hozir ishga tushiring.</p>
      <div className="mt-4 text-[14px] text-primary">
        {!status ? 'Yuklanmoqda…'
          : !status.configured ? <span className="text-danger">Sozlanmagan — «Sayt ma'lumotlari» bo'limida Billz kaliti va do'konini saqlang.</span>
          : status.running ? 'Ishlayapti…'
          : !last ? 'Hali sinxronlanmagan.'
          : last.ok
            ? <>Oxirgi: {when} · ko'rildi {last.seen}/{last.count} · yangi {last.inserted} · yangilandi {last.updated} · yashirildi {last.hidden} · rasm {last.photos}{last.skipped ? ` · o'tkazildi ${last.skipped}` : ''}{last.note ? ` · ${last.note}` : ''}</>
            : <span className="text-danger">Oxirgi urinish xato: {errText(new Error(last.error ?? 'network'))} ({when})</span>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={run} disabled={busy} className="press px-5 py-2 bg-accent text-white font-semibold rounded-full text-[14px] disabled:opacity-50">Sinxronlash</button>
        {msg && <span className="text-[13px] text-muted">{msg}</span>}
      </div>
      <p className="mt-4 text-[12.5px] text-muted-2">
        Billz'dan kelgan mahsulotlarning nomi, narxi, qoldig'i, turi va tavsifi har sinxronizatsiyada qayta yoziladi; reyting, sharhlar va tartib sizniki.
        Rasmsiz tovar saytda ko'rinmaydi — rasmni «Mahsulotlar → Rasm kerak» ro'yxatidan shu yerda yoki Billz'da qo'shing.
      </p>
    </section>
  );
}
