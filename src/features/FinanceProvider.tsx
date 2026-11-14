import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as repository from '@/core/database/repository';
import { discardAlert, importNativeAlerts, ingestImage, ingestText, processQueue, purgeExpiredAlerts } from '@/core/ingestion/pipeline';
import { getCaptureStatus, isCaptureAvailable, type CaptureStatus } from '@/core/ingestion/nativeCapture';
import { getAIConsent, isAIConfigured, setAIConsent as storeAIConsent } from '@/core/ai/client';
import { subscribeAuth, syncTransactions } from '@/core/firebase/cloud';
import type { ParsedTransaction, QueuedAlert, Transaction } from '@/types/transaction';

type User = { uid: string; email: string | null };
interface FinanceContextValue {
  transactions: Transaction[]; queue: QueuedAlert[]; loading: boolean; busy: boolean; processing: boolean;
  error: string | null; notice: string | null; budget: number; cloudSync: boolean; user: User | null;
  capture: CaptureStatus | null; aiConsent: boolean; aiConfigured: boolean;
  refresh: () => Promise<void>; dismissError: () => void;
  run: (task: () => Promise<void>, success?: string) => Promise<boolean>;
  save: (value: ParsedTransaction, existing?: Transaction) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  addText: (text: string) => Promise<boolean>; addImage: (uri: string) => Promise<boolean>;
  retryQueue: (ids: readonly string[]) => Promise<boolean>; discardQueue: (id: string) => Promise<boolean>;
  saveBudget: (value: number) => Promise<boolean>; setCloudSync: (enabled: boolean) => Promise<boolean>;
  setAIConsent: (enabled: boolean) => Promise<boolean>;
  sync: () => Promise<boolean>;
}
const FinanceContext = createContext<FinanceContextValue | null>(null);
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [queue, setQueue] = useState<QueuedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [budget, setBudget] = useState(0);
  const [cloudSync, setCloudSyncState] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [capture, setCapture] = useState<CaptureStatus | null>(null);
  const [aiConsent, setAIConsentState] = useState(false);
  const aiConfigured = isAIConfigured();
  const authRevision = useRef(0);
  const refreshRevision = useRef(0);
  const ready = useRef(false);
  const mounted = useRef(false);
  const foregroundLock = useRef(false);
  const active = useRef(AppState.currentState === 'active' || AppState.currentState == null);
  const actionLock = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++refreshRevision.current;
    const account = authRevision.current;
    await purgeExpiredAlerts();
    const [rows, alerts, storedBudget, syncEnabled, status, consentEnabled] = await Promise.all([
      repository.listTransactions(), repository.listQueuedAlerts(), repository.getSetting('monthlyBudget'),
      repository.getSetting('cloudSync'), isCaptureAvailable() ? getCaptureStatus() : Promise.resolve(null), getAIConsent(),
    ]);
    if (!mounted.current || request !== refreshRevision.current || account !== authRevision.current) return;
    setTransactions(rows); setQueue(alerts);
    setBudget(Number(storedBudget) || 0); setCloudSyncState(syncEnabled === 'true'); setCapture(status);
    setAIConsentState(consentEnabled);
  }, []);
  const foreground = useCallback(async () => {
    if (!ready.current || !active.current || foregroundLock.current) return;
    foregroundLock.current = true;
    try {
      if (isCaptureAvailable()) await importNativeAlerts();
      await refresh();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { foregroundLock.current = false; }
  }, [refresh]);
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        await repository.initializeDatabase();
        if (!mounted.current) return;
        await refresh(); ready.current = true;
        await foreground();
      } catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
      finally { if (mounted.current) setLoading(false); }
    })();
    const unsubscribeAuth = subscribeAuth((nextUser) => {
      authRevision.current++;
      setUser(nextUser);
      setAIConsentState(false);
      setCloudSyncState(false);
      if (ready.current) void refresh().catch((cause: unknown) => { if (mounted.current) setError(errorMessage(cause)); });
    });
    const subscription = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      if (active.current) void foreground();
    });
    return () => { mounted.current = false; ready.current = false; unsubscribeAuth(); subscription.remove(); };
  }, [foreground, refresh]);
  const run = useCallback(async (task: () => Promise<void>, success?: string) => {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      await task(); await refresh();
      if (success) setNotice(success);
      return true;
    } catch (cause) { setError(errorMessage(cause)); return false; }
    finally { actionLock.current = false; setBusy(false); }
  }, [refresh]);
  const save = (value: ParsedTransaction, existing?: Transaction) => run(async () => {
    if (existing) await repository.updateTransaction({ ...existing, ...value, status: 'confirmed' });
    else await repository.saveTransaction(value, { source: 'manual', status: 'confirmed' });
  }, existing?.status === 'review' ? 'Đã kiểm tra và xác nhận giao dịch.' : 'Đã lưu giao dịch trên thiết bị.');
  const addText = (text: string) => run(async () => {
    const result = await ingestText(text, 'manual');
    if (!result.queued) throw new Error(result.reason || 'Nội dung không được nhận vào hàng đợi.');
  }, 'Đã lưu nội dung trên thiết bị. Chưa gửi đến OpenAI; chọn mục và xác nhận gửi trong hàng đợi.');
  const addImage = (uri: string) => run(async () => { await ingestImage(uri); }, 'Đã lưu ảnh trên thiết bị. Chưa gửi đến OpenAI.');
  const retryQueue = (ids: readonly string[]) => run(async () => {
    const account = authRevision.current;
    if (!aiConfigured || !user || !await getAIConsent()) throw new Error('Cần cấu hình AI, đăng nhập và đồng ý riêng trong Cài đặt trước khi gửi đến OpenAI.');
    if (account !== authRevision.current) throw new Error('Tài khoản đã thay đổi. Chọn lại và xác nhận các mục trước khi gửi.');
    if (!ids.length) throw new Error('Chọn ít nhất một mục trong hàng đợi để gửi.');
    if (!active.current) throw new Error('Mở ứng dụng để gửi các mục đã chọn.');
    setProcessing(true);
    try {
      const result = await processQueue(ids);
      setNotice(`Đã xử lý ${result.processed} mục; ${result.failed} mục lỗi vẫn được giữ trên thiết bị để thử lại. Kết quả AI cần duyệt, chưa tính vào tổng.`);
    } finally { setProcessing(false); }
  });
  const sync = () => run(async () => {
    if (!user || !cloudSync) throw new Error('Đăng nhập và bật đồng bộ trước.');
    const result = await syncTransactions();
    setNotice(`Đã gửi ${result.pushed}, nhận ${result.pulled} thay đổi.`);
  });
  return <FinanceContext.Provider value={{ transactions, queue, loading, busy, processing, error, notice, budget, cloudSync, user, capture, aiConsent, aiConfigured, refresh,
    dismissError: () => { setError(null); setNotice(null); }, run, save,
    remove: (id) => run(() => repository.deleteTransaction(id), 'Đã xóa. Dấu xóa được giữ để đồng bộ an toàn.'),
    addText, addImage, retryQueue,
    discardQueue: (id) => run(() => discardAlert(id), 'Đã xóa mục và ảnh riêng khỏi hàng đợi.'),
    saveBudget: (value) => run(() => repository.setSetting('monthlyBudget', String(value)), 'Đã lưu ngân sách hàng tháng trên thiết bị.'),
    setAIConsent: (enabled) => run(async () => {
      if (enabled && !user) throw new Error('Cần đăng nhập trước khi đồng ý gửi dữ liệu đến OpenAI.');
      await storeAIConsent(enabled);
    }, enabled ? 'Đã cho phép AI cho tài khoản này. Chưa gửi dữ liệu; chọn mục và xác nhận trong hàng đợi.' : 'Đã tắt cho phép AI. Không thể rút lại yêu cầu đã gửi; dữ liệu đang chờ vẫn trên thiết bị.'),
    setCloudSync: (enabled) => run(async () => {
      if (enabled && !user) throw new Error('Cần đăng nhập trước khi bật đồng bộ.');
      await repository.setSetting('cloudSync', String(enabled));
    }, enabled ? 'Đã cho phép đồng bộ. Nhấn Đồng bộ ngay để gửi dữ liệu.' : 'Đã tắt đồng bộ đám mây.'), sync,
  }}>{children}</FinanceContext.Provider>;
}
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('FinanceProvider is missing');
  return context;
}
