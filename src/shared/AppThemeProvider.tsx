import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';
import { darkTheme, lightTheme } from './theme';

export type AppearancePreference = 'system' | 'light' | 'dark';
const key = 'kesefly.appearance.v1';
const AppearanceContext = createContext<{
  preference: AppearancePreference; setPreference: (value: AppearancePreference) => void; storageError: string | null;
}>({ preference: 'system', setPreference: () => {}, storageError: null });
export const useAppearance = () => useContext(AppearanceContext);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [storageError, setStorageError] = useState<string | null>(null);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  const [fontsLoaded, fontError] = useFonts(MaterialCommunityIcons.font);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then((value) => {
      if (active && !changed.current && (value === 'light' || value === 'dark' || value === 'system')) setPreferenceState(value);
    }).catch(() => { if (active) setStorageError('Không đọc được tùy chọn giao diện. Đang dùng thiết lập hiện tại.'); });
    return () => { active = false; };
  }, []);
  function setPreference(value: AppearancePreference) {
    changed.current = true;
    setPreferenceState(value);
    setStorageError(null);
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, value)).catch(() => {
      setStorageError('Giao diện đã đổi nhưng chưa lưu được cho lần mở sau.');
    });
  }
  const dark = preference === 'dark' || (preference === 'system' && scheme === 'dark');
  const theme = dark ? darkTheme : lightTheme;
  if (!fontsLoaded && !fontError) return <View style={[styles.loading, { backgroundColor: theme.colors.background }]}><ActivityIndicator color={theme.colors.primary} accessibilityLabel="Đang tải giao diện" /></View>;
  return <AppearanceContext.Provider value={{ preference, setPreference, storageError }}>
    <PaperProvider theme={theme} settings={{ icon: ({ name, color, size, ...props }) => <MaterialCommunityIcons {...props} name={name as keyof typeof MaterialCommunityIcons.glyphMap} color={color} size={size} /> }}>
      {fontError ? <Text accessibilityRole="alert">Không tải được biểu tượng. Hãy mở lại ứng dụng.</Text> : null}
      {children}
    </PaperProvider>
  </AppearanceContext.Provider>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
