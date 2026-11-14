import type { NativeBankAlert } from '../../types/transaction';
export const DEFAULT_BANK_PACKAGES = ['com.VCB', 'com.vnpay.bidv', 'com.mbmobile', 'com.techcombank.retail', 'com.vietinbank.ipay'];
export interface CaptureStatus { enabled: boolean; consent: boolean; packages: string[]; pending: number }
const unavailable = () => new Error('Bank notification capture is available only in an Android development or production build.');
export function isCaptureAvailable(): boolean { return false; }
export async function getCaptureStatus(): Promise<CaptureStatus> { return { enabled: false, consent: false, packages: [], pending: 0 }; }
export async function configureCapture(consent: boolean, _packages: string[]): Promise<void> { if (consent) throw unavailable(); }
export async function openCaptureSettings(): Promise<void> { throw unavailable(); }
export async function openBatterySettings(): Promise<void> { throw unavailable(); }
export async function readNativeAlerts(): Promise<NativeBankAlert[]> { return []; }
export async function acknowledgeNativeAlerts(_ids: string[]): Promise<void> {}
// Browser storage is not included in Android/iOS device backup configuration.
export async function protectPrivateStorage(): Promise<void> {}
