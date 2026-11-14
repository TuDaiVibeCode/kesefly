import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useFinance } from './FinanceProvider';
import { TransactionForm } from './TransactionForm';
import { Action, Banner, Card, Copy, Empty, Row, Screen } from '@/shared/ui';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, loading, remove, busy } = useFinance(); const [confirmDelete, setConfirmDelete] = useState(false);
  const transaction = transactions.find((row) => row.id === id);
  return <Screen title={transaction?.status === 'review' ? 'Kiểm tra trước khi ghi sổ.' : 'Chi tiết giao dịch'}>
    <Action compact variant="secondary" label="‹ Về sổ giao dịch" onPress={() => router.replace('/transactions')} />
    {transaction ? <><TransactionForm key={transaction.id} existing={transaction} onSaved={() => router.replace('/transactions')} />
      <Card><Copy tone="muted">Nguồn: {transaction.source === 'notification' ? 'thông báo ngân hàng' : transaction.source === 'image' ? 'ảnh hóa đơn' : 'thủ công hoặc nội dung dán'}. {transaction.syncedAt ? 'Đã từng đồng bộ.' : 'Chưa đồng bộ.'}</Copy>
        {confirmDelete ? <><Banner danger>Xóa giao dịch này khỏi sổ? Giao dịch cũng sẽ bị xóa khỏi tài khoản ở lần đồng bộ tiếp theo. Không thể hoàn tác.</Banner><Row><Action compact variant="danger" label="Xác nhận xóa" disabled={busy} onPress={() => { void remove(transaction.id).then((ok) => { if (ok) router.replace('/transactions'); }); }} /><Action compact variant="secondary" label="Không xóa" onPress={() => setConfirmDelete(false)} /></Row></> : <Action variant="danger" label="Xóa giao dịch" onPress={() => setConfirmDelete(true)} />}
      </Card>
    </> : !loading && <Empty title="Không còn giao dịch này" detail="Giao dịch đã bị xóa hoặc không tồn tại trên thiết bị. Quay về sổ để xem các giao dịch hiện có." />}
  </Screen>;
}
