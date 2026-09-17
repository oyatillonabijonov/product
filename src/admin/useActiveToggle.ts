import { errText } from './errText';
import { useToast } from './ui/toast';

type Setter<T> = (update: (items: T[] | null) => T[] | null) => void;

/**
 * Ro'yxat qatoridagi "Saytda" toggle'i: qator darhol almashadi, `save` (to'liq yozuv bilan `PUT`) xato bersa qaytadi.
 * Kontent route'larida `PATCH` yo'q — yozuv ro'yxatdan to'liq keladi.
 */
export function useActiveToggle<T extends { id: string; isActive: boolean }>(setItems: Setter<T>, save: (item: T) => Promise<unknown>) {
  const toast = useToast();
  return async (item: T, on: boolean) => {
    const flip = (v: boolean) => setItems((xs) => xs && xs.map((x) => (x.id === item.id ? { ...x, isActive: v } : x)));
    flip(on);
    try {
      await save({ ...item, isActive: on });
      toast(on ? "Saytda ko'rsatildi" : 'Yashirildi');
    } catch (e) {
      flip(!on);
      toast(errText(e), 'error');
    }
  };
}
