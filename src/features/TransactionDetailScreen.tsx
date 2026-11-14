import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useFinance } from './FinanceProvider';
import { TransactionForm } from './TransactionForm';
import { Action, Banner, Card, Copy, Empty, Row, Screen } from '@/shared/ui';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, loading, remove, busy } = useFinance(); const [confirmDelete, setConfirmDelete] = useState(false);
  const transaction = transactions.find((row) => row.id === id);
  return <Screen title={transaction?.status === 'review' ? 'Kiểm tra trước khi ghi sổ.' : 'Chi tiết giao dịch'} eyebrow="SỔ GIAO DỊCH">
    <Action compact variant="secondary" label="‹ Về sổ giao dịch" onPress={() => router.replace('/transactions')} />
    {transaction ? <><TransactionForm key={transaction.id} existing={transaction} onSaved={() => router.replace('/transactions')} />
      <Card><Copy tone="muted">Nguồn: {transaction.source === 'notification' ? `thông báo ${transaction.sourcePackage ?? ''}` : transaction.source === 'image' ? 'ảnh hóa đơn' : 'thủ công hoặc nội dung dán'}. {transaction.syncedAt ? 'Đã từng đồng bộ.' : 'Lưu cục bộ; chưa đồng bộ.'}</Copy>
        {confirmDelete ? <><Banner danger>Xóa giao dịch này khỏi sổ? Dấu xóa được giữ để lần đồng bộ tiếp theo cũng xóa bản đám mây. Không thể hoàn tác.</Banner><Row><Action compact variant="danger" label="Xác nhận xóa" disabled={busy} onPress={() => { void remove(transaction.id).then((ok) => { if (ok) router.replace('/transactions'); }); }} /><Action compact variant="secondary" label="Không xóa" onPress={() => setConfirmDelete(false)} /></Row></> : <Action variant="danger" label="Xóa giao dịch" onPress={() => setConfirmDelete(true)} />}
      </Card>
    </> : !loading && <Empty title="Không còn giao dịch này" detail="Giao dịch đã bị xóa hoặc không tồn tại trên thiết bị. Quay về sổ để xem các giao dịch hiện có." />}
  </Screen>;
}
