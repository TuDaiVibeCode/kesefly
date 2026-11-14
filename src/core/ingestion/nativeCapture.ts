import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { DEFAULT_BANK_PACKAGES } from './bankPackages';
import type { NativeBankAlert } from '../../types/transaction';

export { DEFAULT_BANK_PACKAGES };
export interface CaptureStatus { enabled: boolean; consent: boolean; packages: string[]; pending: number }
interface CaptureModule {
  getStatus(): Promise<CaptureStatus>;
  configure(consent: boolean, packages: string[]): Promise<void>;
  openSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  readAlerts(): Promise<NativeBankAlert[]>;
  acknowledge(ids: string[]): Promise<void>;
  postTestAlert?(bankLabel: string, transactionText: string): Promise<void>;
}
const native = Platform.OS === 'android' ? requireOptionalNativeModule<CaptureModule>('BankNotifications') : null;
const unavailable = () => new Error('Bank notification capture requires a Kesefly Android development or production build.');
export function isCaptureAvailable(): boolean { return native !== null; }
export async function getCaptureStatus(): Promise<CaptureStatus> {
  return native ? native.getStatus() : { enabled: false, consent: false, packages: [], pending: 0 };
}
export async function configureCapture(consent: boolean, packages: string[]): Promise<void> {
  if (!native) { if (consent) throw unavailable(); return; }
  await native.configure(consent, [...new Set(packages.map((value) => value.trim()).filter(Boolean))]);
}
export async function openCaptureSettings(): Promise<void> { if (!native) throw unavailable(); await native.openSettings(); }
export async function openBatterySettings(): Promise<void> { if (!native) throw unavailable(); await native.openBatterySettings(); }
export async function readNativeAlerts(): Promise<NativeBankAlert[]> { return native ? native.readAlerts() : []; }
export async function acknowledgeNativeAlerts(ids: string[]): Promise<void> { if (native && ids.length) await native.acknowledge(ids); }

/** Test-only: posts a synthetic bank alert explicitly marked as not from a real bank. */
export async function postTestAlert(bankLabel: string, transactionText: string): Promise<void> {
  if (!native?.postTestAlert) throw unavailable();
  await native.postTestAlert(bankLabel, transactionText);
}

/** Must complete before private iOS databases, images, or model files are created. */
export async function protectPrivateStorage(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const privacy = requireOptionalNativeModule<{ excludePrivateDataFromBackup(): Promise<void> }>('BankNotifications');
  if (!privacy) throw new Error('Private storage protection requires a Kesefly iOS development or production build.');
  await privacy.excludePrivateDataFromBackup();
}
