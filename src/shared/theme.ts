import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    background: '#F3F6FA', surface: '#FFFFFF', surfaceAlt: '#EAF0F7', text: '#142742', muted: '#51637B', border: '#CDD8E5',
    primary: '#205BCC', onPrimary: '#FFFFFF', primarySoft: '#E8F0FF', positive: '#087853', positiveSoft: '#E1F4EB',
    negative: '#B4313E', negativeSoft: '#FCECEF', warning: '#825107', warningSoft: '#FFF3DA',
    ledger: '#112A4C', onLedger: '#FFFFFF', ledgerMuted: '#B8CBE3', scrim: '#07172EBB',
  },
  dark: {
    background: '#0B1626', surface: '#14253B', surfaceAlt: '#1B304A', text: '#EFF5FD', muted: '#ADC0D8', border: '#354D69',
    primary: '#8CB5FF', onPrimary: '#10284D', primarySoft: '#203D63', positive: '#75D9AF', positiveSoft: '#163E34',
    negative: '#FF9BA8', negativeSoft: '#482B39', warning: '#F6CB7C', warningSoft: '#453A23',
    ledger: '#17355C', onLedger: '#FFFFFF', ledgerMuted: '#BED2EB', scrim: '#030A14CC',
  },
};
export function useTokens() { return palette[useColorScheme() === 'dark' ? 'dark' : 'light']; }
export const categoryLabels = {
  'Food & Drink': 'Ăn uống', Shopping: 'Mua sắm', Transport: 'Di chuyển', Bills: 'Hóa đơn', Transfer: 'Chuyển khoản', Salary: 'Lương', Other: 'Khác',
};
export const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function monthKey(date = new Date()) { return localDate(date).slice(0, 7); }
export function isInMonth(date: string, month: string) { return monthKey(new Date(date)) === month; }
