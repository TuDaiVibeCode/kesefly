import type { ParsedTransaction, QueuedAlert } from '../../types/transaction';

export type ModelState = { phase: 'idle' | 'downloading' | 'loading' | 'ready' | 'error' | 'unsupported'; progress: number; error: string | null };
const state: ModelState = { phase: 'unsupported', progress: 0, error: 'Private on-device inference requires an ARM Android/iOS development build. Web supports manual entry only.' };
export function getModelState(): ModelState { return state; }
export function subscribeModel(_listener: () => void): () => void {
  // This platform capability never changes during a browser session.
  return () => {};
}
export function prepareModel(): Promise<void> { return Promise.reject(new Error(state.error!)); }
export function unloadModel(): void {
  // No native model is loaded on this platform.
}
export function parseAlert(_alert: QueuedAlert): Promise<ParsedTransaction> { return Promise.reject(new Error(state.error!)); }
