import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';
import { parseDateOnly } from './dates';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, section: 24, large: 32, touch: 48 } as const;
export const shapes = { small: 8, medium: 12, large: 16, dialog: 28 } as const;

export const lightTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...{
  "primary": "#2563EB",
  "onPrimary": "#FFFFFF",
  "primaryContainer": "#DBEAFE",
  "onPrimaryContainer": "#1E3A8A",
  "secondary": "#52647A",
  "onSecondary": "#FFFFFF",
  "secondaryContainer": "#E3EAF4",
  "onSecondaryContainer": "#1D2939",
  "tertiary": "#0F766E",
  "onTertiary": "#FFFFFF",
  "tertiaryContainer": "#CCFBF1",
  "onTertiaryContainer": "#134E4A",
  "error": "#B42318",
  "onError": "#FFFFFF",
  "errorContainer": "#FEE4E2",
  "onErrorContainer": "#7A271A",
  "background": "#FFFFFF",
  "onBackground": "#111827",
  "surface": "#FFFFFF",
  "onSurface": "#111827",
  "surfaceVariant": "#F3F6FA",
  "onSurfaceVariant": "#475569",
  "outline": "#64748B",
  "outlineVariant": "#D8E0EA",
  "inverseSurface": "#1F2937",
  "inverseOnSurface": "#F8FAFC",
  "inversePrimary": "#93B4FF",
  "shadow": "#000000",
  "scrim": "#000000",
  "backdrop": "rgba(15, 23, 42, 0.32)",
  "surfaceDisabled": "rgba(17, 24, 39, 0.12)",
  "onSurfaceDisabled": "rgba(17, 24, 39, 0.38)",
  "elevation": {
    "level0": "transparent",
    "level1": "#F8FAFC",
    "level2": "#F1F5F9",
    "level3": "#EAF0F7",
    "level4": "#E5ECF4",
    "level5": "#DFE7F0"
  }
} },
  financial: {
  "income": "#15803D",
  "incomeContainer": "#DCFCE7",
  "onIncomeContainer": "#14532D",
  "expense": "#111827",
  "warning": "#A16207",
  "warningContainer": "#FEF3C7",
  "onWarningContainer": "#713F12",
  "info": "#1D4ED8",
  "infoContainer": "#DBEAFE",
  "onInfoContainer": "#1E3A8A"
},
  chart: ["#2563EB", "#52647A", "#0F766E", "#A16207", "#6D5BD0"],
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...{
  "primary": "#2563EB",
  "onPrimary": "#FFFFFF",
  "primaryContainer": "#1E3A8A",
  "onPrimaryContainer": "#DBEAFE",
  "secondary": "#BBC7D8",
  "onSecondary": "#17202B",
  "secondaryContainer": "#35445A",
  "onSecondaryContainer": "#E4EBF5",
  "tertiary": "#5EEAD4",
  "onTertiary": "#042F2E",
  "tertiaryContainer": "#134E4A",
  "onTertiaryContainer": "#99F6E4",
  "error": "#FFB4AB",
  "onError": "#690005",
  "errorContainer": "#93000A",
  "onErrorContainer": "#FFDAD6",
  "background": "#0B0F14",
  "onBackground": "#E5E7EB",
  "surface": "#0F141B",
  "onSurface": "#E5E7EB",
  "surfaceVariant": "#273244",
  "onSurfaceVariant": "#C1CAD6",
  "outline": "#8A98A8",
  "outlineVariant": "#3B4656",
  "inverseSurface": "#E5E7EB",
  "inverseOnSurface": "#111827",
  "inversePrimary": "#1D4ED8",
  "shadow": "#000000",
  "scrim": "#000000",
  "backdrop": "rgba(0, 0, 0, 0.60)",
  "surfaceDisabled": "rgba(229, 231, 235, 0.12)",
  "onSurfaceDisabled": "rgba(229, 231, 235, 0.38)",
  "elevation": {
    "level0": "transparent",
    "level1": "#151C26",
    "level2": "#192230",
    "level3": "#1E2938",
    "level4": "#232F40",
    "level5": "#293649"
  }
} },
  financial: {
  "income": "#86EFAC",
  "incomeContainer": "#14532D",
  "onIncomeContainer": "#DCFCE7",
  "expense": "#E5E7EB",
  "warning": "#FBBF24",
  "warningContainer": "#713F12",
  "onWarningContainer": "#FDE68A",
  "info": "#93B4FF",
  "infoContainer": "#1E3A8A",
  "onInfoContainer": "#DBEAFE"
},
  chart: ["#60A5FA", "#A8B8CC", "#5EEAD4", "#FBBF24", "#B9AEFF"],
};

export type AppTheme = typeof lightTheme;
export const useAppTheme = () => useTheme<AppTheme>();

// Compatibility adapter for existing screens; all colors still come from one Paper theme.
export function useTokens() {
  const t = useAppTheme();
  return { background: t.colors.background, surface: t.colors.surface, surfaceAlt: t.colors.surfaceVariant,
    text: t.colors.onSurface, muted: t.colors.onSurfaceVariant, border: t.colors.outlineVariant,
    primary: t.colors.primary, onPrimary: t.colors.onPrimary, primarySoft: t.colors.primaryContainer, onPrimarySoft: t.colors.onPrimaryContainer, link: t.financial.info,
    positive: t.financial.income, positiveSoft: t.financial.incomeContainer, onPositiveSoft: t.financial.onIncomeContainer,
    negative: t.colors.error, negativeSoft: t.colors.errorContainer, onNegativeSoft: t.colors.onErrorContainer,
    warning: t.financial.warning, warningSoft: t.financial.warningContainer,
    ledger: t.colors.elevation.level1, onLedger: t.colors.onSurface, ledgerMuted: t.colors.onSurfaceVariant,
    scrim: t.colors.backdrop };
}
export const categoryLabels = {
  'Food & Drink': 'Ăn uống', Shopping: 'Mua sắm', Transport: 'Di chuyển', Bills: 'Hóa đơn', Transfer: 'Chuyển khoản', Salary: 'Lương', Other: 'Khác',
};
export const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function monthKey(date = new Date()) { return localDate(date).slice(0, 7); }
export function isInMonth(date: string, month: string) { const parsed = parseDateOnly(date); return parsed ? monthKey(parsed) === month : false; }
