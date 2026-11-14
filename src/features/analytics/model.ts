import { CATEGORIES, type Category, type Transaction } from '@/types/transaction';
import { parseDateOnly } from '@/shared/dates';
import { dashboardModel, calendarKey, monthLabel, shiftMonth } from '@/features/dashboard/model';

export type InsightSeverity = 'info' | 'warning' | 'error';
export interface Insight {
  id: 'total-change' | 'category-change' | 'top-category' | 'budget';
  title: string;
  summary: string;
  evidence: string;
  period: string;
  complete: boolean;
  relevance: string;
  action: string;
  severity: InsightSeverity;
  category?: Category;
  amount?: number;
  previous?: number;
  difference?: number;
  percent?: number | null;
}
export interface CategoryComparison {
  category: Category;
  current: number;
  previous: number;
  difference: number;
  percent: number | null;
}
export interface TrendPoint { month: string; label: string; amount: number; selected: boolean }

export function analyticsModel(
  transactions: readonly Transaction[], month: string, now: Date, budget = 0,
) {
  const base = dashboardModel(transactions, month, now);
  const currentMonth = calendarKey(now).slice(0, 7);
  const [year, number] = month.split('-').map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(year, number, 0).getDate()).padStart(2, '0')}`;
  const cutoff = month === currentMonth ? calendarKey(now) : month < currentMonth ? monthEnd : monthStart;
  const confirmed = transactions.filter((row) => row.status === 'confirmed' && row.deletedAt == null && parseDateOnly(row.date) !== null);
  const dayOf = (row: Transaction) => calendarKey(parseDateOnly(row.date)!);
  const previousRows = confirmed.filter((row) => {
    const day = dayOf(row);
    return base.comparison.previousStart <= day && day <= base.comparison.previousEnd;
  });
  const previousByCategory = new Map<Category, number>();
  for (const row of previousRows) if (row.type === 'EXPENSE') previousByCategory.set(row.category, (previousByCategory.get(row.category) ?? 0) + row.amount);
  const currentByCategory = new Map<Category, number>();
  for (const row of base.rows) if (row.type === 'EXPENSE') currentByCategory.set(row.category, (currentByCategory.get(row.category) ?? 0) + row.amount);
  const categories: CategoryComparison[] = CATEGORIES
    .map((category) => {
      const current = currentByCategory.get(category) ?? 0;
      const previous = previousByCategory.get(category) ?? 0;
      const difference = current - previous;
      return { category, current, previous, difference, percent: previous > 0 ? difference / previous * 100 : null };
    })
    .filter((row) => row.current > 0 || row.previous > 0)
    .sort((a, b) => b.current - a.current || b.previous - a.previous || a.category.localeCompare(b.category));
  const maxCategory = Math.max(0, ...categories.map((row) => Math.max(row.current, row.previous)));
  const trends: TrendPoint[] = [];
  for (let offset = -5; offset <= 0; offset++) {
    const key = shiftMonth(month, offset);
    let end = `${key}-${String(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
    if (key === currentMonth) end = calendarKey(now);
    const amount = confirmed.reduce((sum, row) => {
      if (row.type !== 'EXPENSE') return sum;
      const day = dayOf(row);
      return day.startsWith(`${key}-`) && day <= end ? sum + row.amount : sum;
    }, 0);
    trends.push({ month: key, label: `T${Number(key.slice(5, 7))}`, amount, selected: key === month });
  }
  const maxTrend = Math.max(0, ...trends.map((point) => point.amount));
  const currentEnd = base.comparison.currentEnd;
  const period = `${monthLabel(month)} (${monthStart.split('-').reverse().join('/')} – ${currentEnd.split('-').reverse().join('/')})`;
  const previousPeriod = `${base.comparison.previousStart.split('-').reverse().join('/')} – ${base.comparison.previousEnd.split('-').reverse().join('/')}`;
  const insights: Insight[] = [];
  if (base.comparison.available && base.rows.length > 0) {
    const change = base.comparison.difference;
    insights.push({
      id: 'total-change',
      title: change === 0 ? 'Tổng chi không đổi' : `Tổng chi ${change > 0 ? 'tăng' : 'giảm'} ${Math.abs(change) > 0 ? new Intl.NumberFormat('vi-VN').format(Math.abs(change)) : '0'} ₫`,
      summary: change === 0
        ? 'Tổng chi trong kỳ bằng kỳ trước. Xem danh mục bên dưới để biết khoản nào thay đổi.'
        : `Kỳ này ${change > 0 ? 'cao hơn' : 'thấp hơn'} ${new Intl.NumberFormat('vi-VN').format(Math.abs(change))} ₫ so với cùng số ngày của kỳ trước.`,
      evidence: `${new Intl.NumberFormat('vi-VN').format(base.comparison.comparableSpending)} ₫ trong kỳ này và ${new Intl.NumberFormat('vi-VN').format(base.comparison.previousSpending)} ₫ trong kỳ so sánh.`,
      period: `${monthStart.split('-').reverse().join('/')} – ${currentEnd.split('-').reverse().join('/')} so với ${previousPeriod}.`,
      complete: base.ongoing,
      relevance: 'So sánh cùng số ngày giúp tránh kết luận sai khi tháng hiện tại chưa kết thúc.',
      action: 'Mở danh mục bên dưới để xem khoản nào đóng góp nhiều nhất vào thay đổi này.',
      severity: 'info', amount: base.comparison.comparableSpending, previous: base.comparison.previousSpending, difference: change,
      percent: base.comparison.percent,
    });
  }
  const changeRows = categories.filter((row) => row.previous > 0 && row.difference !== 0).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  const categoryChange = changeRows[0];
  if (categoryChange) {
    insights.push({
      id: 'category-change',
      title: `${categoryLabel(categoryChange.category)} ${categoryChange.difference > 0 ? 'tăng' : 'giảm'} ${new Intl.NumberFormat('vi-VN').format(Math.abs(categoryChange.difference))} ₫`,
      summary: `Đây là mức thay đổi lớn nhất theo số tiền giữa hai kỳ trong các danh mục có dữ liệu ở kỳ trước.`,
      evidence: `${new Intl.NumberFormat('vi-VN').format(categoryChange.current)} ₫ trong kỳ này và ${new Intl.NumberFormat('vi-VN').format(categoryChange.previous)} ₫ trong kỳ so sánh, thuộc danh mục ${categoryLabel(categoryChange.category)}.`,
      period: `${monthStart.split('-').reverse().join('/')} – ${currentEnd.split('-').reverse().join('/')} so với ${previousPeriod}.`,
      complete: base.ongoing,
      relevance: 'Thay đổi theo danh mục giúp bạn kiểm tra lại các giao dịch cụ thể thay vì chỉ nhìn tổng tiền.',
      action: 'Xem lại các giao dịch trong danh mục này và xác nhận chúng đúng với thực tế.',
      severity: 'info', category: categoryChange.category, amount: categoryChange.current, previous: categoryChange.previous,
      difference: categoryChange.difference, percent: categoryChange.percent,
    });
  }
  const top = categories[0];
  if (top && base.spending > 0) {
    const share = top.current / base.spending * 100;
    insights.push({
      id: 'top-category',
      title: `${categoryLabel(top.category)} chiếm ${formatPercent(share)} tổng chi`,
      summary: `Đây là danh mục lớn nhất trong kỳ, với ${new Intl.NumberFormat('vi-VN').format(top.current)} ₫ trên tổng ${new Intl.NumberFormat('vi-VN').format(base.spending)} ₫.`,
      evidence: `${countCategory(base.rows, top.category)} giao dịch đã xác nhận thuộc ${categoryLabel(top.category)}.`,
      period, complete: base.ongoing,
      relevance: 'Một danh mục lớn chưa chắc là chi tiêu không cần thiết; đây là nơi thay đổi nhỏ cũng tạo ra chênh lệch đáng kể.',
      action: 'Xem các giao dịch của danh mục và cân nhắc điều chỉnh nếu phù hợp với ưu tiên của bạn.',
      severity: 'info', category: top.category, amount: top.current, difference: top.difference, percent: share,
    });
  }
  if (budget > 0) {
    const ratio = base.spending / budget;
    if (ratio >= 0.8) {
      insights.push({
        id: 'budget',
        title: ratio >= 1 ? `Đã vượt ngân sách ${new Intl.NumberFormat('vi-VN').format(base.spending - budget)} ₫` : `Đã dùng ${formatPercent(ratio * 100)} ngân sách tháng`,
        summary: `Bạn đã chi ${new Intl.NumberFormat('vi-VN').format(base.spending)} ₫ trên hạn mức ${new Intl.NumberFormat('vi-VN').format(budget)} ₫.`,
        evidence: `Còn ${Math.max(0, budget - base.spending).toLocaleString('vi-VN')} ₫ trong hạn mức; đây là tổng đã xác nhận, chưa gồm giao dịch cần duyệt.`,
        period, complete: base.ongoing,
        relevance: ratio >= 1 ? 'Vượt hạn mức là tín hiệu để rà soát, không phải kết luận về việc chi tiêu đúng hay sai.' : 'Theo dõi sớm giúp bạn điều chỉnh nhịp chi trước khi chạm hạn mức.',
        action: 'Mở Ngân sách để xem tiến độ từng danh mục và cập nhật hạn mức nếu cần.',
        severity: ratio >= 1 ? 'warning' : 'info', amount: base.spending, previous: budget,
      });
    }
  }
  return { ...base, categories, maxCategory, trends, maxTrend, insights, monthStart, monthEnd, cutoff, period, previousPeriod };
}
export function categoryLabel(category: Category) {
  return { 'Food & Drink': 'Ăn uống', Shopping: 'Mua sắm', Transport: 'Di chuyển', Bills: 'Hóa đơn', Transfer: 'Chuyển khoản', Salary: 'Lương', Other: 'Khác' }[category];
}
export function formatPercent(value: number) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Math.abs(value))}%`;
}
export function countCategory(rows: readonly Transaction[], category: Category) {
  return rows.filter((row) => row.type === 'EXPENSE' && row.category === category).length;
}
