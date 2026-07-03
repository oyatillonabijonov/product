import type { FC } from 'react';
import { formatThousands, parseDigits } from './lib/format';

const PriceInput: FC<{
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => (
  <input
    type="text"
    inputMode="numeric"
    autoComplete="off"
    value={formatThousands(value)}
    placeholder={placeholder}
    onChange={(e) => onChange(parseDigits(e.target.value))}
    className={className}
  />
);

export default PriceInput;
