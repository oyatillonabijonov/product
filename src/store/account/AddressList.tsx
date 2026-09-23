import { useState } from 'react';
import type { FC } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import type { Translation } from '../../locales';
import type { ApiAddress } from '../../../shared/address';
import { addressStreetLine, addressTitle } from '../../../shared/address';
import { BTN_MD } from '../ui';
import AccountEmptyState from './AccountEmptyState';
import AddressForm from './AddressForm';

/**
 * Kabinet → Manzillar. Asosiy manzil birinchi turadi va buyurtma formasida
 * o'zi tanlangan bo'lib keladi.
 *
 * Har amal serverdan to'liq ro'yxatni qaytaradi (`{ addresses }`), shuning uchun
 * holat bitta joydan yangilanadi — alohida qayta so'rov yo'q.
 */
const AddressList: FC<{ t: Translation; addresses: ApiAddress[]; onChange: (list: ApiAddress[]) => void }> = ({
  t, addresses, onChange,
}) => {
  const [rawAdding, setAdding] = useState(false);
  const [rawBusyId, setBusyId] = useState(0);
  const busyId = rawBusyId as number;

  async function send(id: number, method: 'DELETE' | 'PATCH') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method });
      const body = await res.json().catch(() => null);
      if (res.ok && body) onChange((body as { addresses: ApiAddress[] }).addresses);
    } finally {
      setBusyId(0);
    }
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button type="button" onClick={() => setAdding(true)} className={`${BTN_MD} bg-accent text-bg hover:bg-accent-hover`}>
          <Plus className="h-[18px] w-[18px]" /> {t.addressAdd}
        </button>
      </div>

      {addresses.length === 0 ? (
        <AccountEmptyState icon={MapPin} text={t.addressEmpty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-sm bg-bg px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-para font-semibold text-primary">{addressStreetLine(a)}</p>
                  <p className="mt-0.5 text-label text-muted">{addressTitle(a)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {a.isDefault ? (
                    <span className="rounded-full bg-trust-soft px-2.5 py-1 text-label font-semibold text-trust">
                      {t.addressDefault}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId !== 0}
                      onClick={() => send(a.id, 'PATCH')}
                      className="press rounded-xs text-label text-link hover:underline disabled:opacity-40"
                    >
                      {t.addressMakeDefault}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t.addressDelete}
                    disabled={busyId !== 0}
                    onClick={() => send(a.id, 'DELETE')}
                    className="press rounded-xs p-1 text-muted-2 hover:text-sale disabled:opacity-40"
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressForm
        t={t}
        open={rawAdding as boolean}
        onSaved={(list) => { onChange(list); setAdding(false); }}
        onClose={() => setAdding(false)}
      />
    </div>
  );
};

export default AddressList;
