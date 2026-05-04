import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Cairo",
    fonts: [
      {
        src: path.join(process.cwd(), "lib/pdf/fonts/Cairo-Regular.ttf"),
      },
      {
        src: path.join(process.cwd(), "lib/pdf/fonts/Cairo-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    fontSize: 10,
    padding: 32,
    color: "#0f172a",
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e3a8a",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
    textAlign: "right",
  },
  meta: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "left",
  },
  summaryRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  summaryCard: {
    flex: 1,
    minWidth: 90,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 3,
    textAlign: "right",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "right",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#f1f5f9",
    padding: 8,
    paddingHorizontal: 10,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e293b",
    textAlign: "right",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row-reverse",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  th: {
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    color: "#475569",
    textAlign: "right",
  },
  tr: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  trAlt: {
    backgroundColor: "#fafafa",
  },
  td: {
    padding: 6,
    fontSize: 9,
    color: "#0f172a",
    textAlign: "right",
  },
  tdMuted: {
    color: "#64748b",
  },
  tfoot: {
    flexDirection: "row-reverse",
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  tfCell: {
    padding: 6,
    fontSize: 10,
    fontWeight: 700,
    textAlign: "right",
  },
  empty: {
    padding: 12,
    textAlign: "center",
    fontSize: 10,
    color: "#94a3b8",
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});

export interface NeighborStatusRow {
  name: string;
  apartmentNumber: string | null;
  due: number;
  paid: number;
  balance: number; // paid - due (negative = remaining, positive = surplus)
  paymentsCount: number;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
}

export interface ExpenseRow {
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  notes: string | null;
}

export interface ReportData {
  buildingName: string;
  monthLabel: string;
  year: number;
  currency: string;
  monthlyAmount: number;
  monthlyAmountSet: boolean;
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  totalSurplus: number;
  totalExpenses: number;
  net: number;
  activeNeighborsCount: number;
  paidCount: number;
  unpaidCount: number;
  neighbors: NeighborStatusRow[];
  expenses: ExpenseRow[];
  generatedAt: string;
}

const fmt = (n: number, currency: string) =>
  `${n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })} ${currency}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

function statusOf(row: NeighborStatusRow): {
  label: string;
  bg: string;
  fg: string;
} {
  if (row.paid === 0) return { label: "لم يدفع", bg: "#fee2e2", fg: "#991b1b" };
  if (row.balance < 0)
    return { label: "متبقي", bg: "#fef3c7", fg: "#92400e" };
  if (row.balance > 0)
    return { label: "فائض", bg: "#dbeafe", fg: "#1e40af" };
  return { label: "مكتمل", bg: "#d1fae5", fg: "#065f46" };
}

export function MonthlyReport({ data }: { data: ReportData }) {
  ensureFonts();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{data.buildingName}</Text>
            <Text style={styles.subtitle}>
              تقرير شهر {data.monthLabel} {data.year}
            </Text>
          </View>
          <Text style={styles.meta}>
            تاريخ الإصدار: {fmtDate(data.generatedAt)}
          </Text>
        </View>

        {/* Summary cards (row 1) */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>على كل ساكن</Text>
            <Text style={[styles.summaryValue, { color: "#1d4ed8" }]}>
              {data.monthlyAmountSet
                ? fmt(data.monthlyAmount, data.currency)
                : "—"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>المتوقّع</Text>
            <Text style={[styles.summaryValue, { color: "#2563eb" }]}>
              {fmt(data.totalExpected, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>المحصّل</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>
              {fmt(data.totalCollected, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>المصروفات</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
              {fmt(data.totalExpenses, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>الصافي</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: data.net >= 0 ? "#059669" : "#dc2626" },
              ]}
            >
              {fmt(data.net, data.currency)}
            </Text>
          </View>
        </View>

        {/* Summary cards (row 2 - balance focus) */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>إجمالي المتبقي</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: data.totalRemaining > 0 ? "#d97706" : "#64748b" },
              ]}
            >
              {fmt(data.totalRemaining, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>إجمالي الفائض</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: data.totalSurplus > 0 ? "#1d4ed8" : "#64748b" },
              ]}
            >
              {fmt(data.totalSurplus, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>دفعوا</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>
              {data.paidCount} / {data.activeNeighborsCount}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>متأخّرون</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: data.unpaidCount > 0 ? "#dc2626" : "#059669" },
              ]}
            >
              {data.unpaidCount}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>نسبة التحصيل</Text>
            <Text style={[styles.summaryValue, { color: "#1d4ed8" }]}>
              {data.totalExpected > 0
                ? `${Math.round((data.totalCollected / data.totalExpected) * 100)}%`
                : "—"}
            </Text>
          </View>
        </View>

        {/* Neighbors status table */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            حالة الجيران ({data.neighbors.length})
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "26%" }]}>الاسم</Text>
            <Text style={[styles.th, { width: "9%" }]}>الشقة</Text>
            <Text style={[styles.th, { width: "13%" }]}>المستحق</Text>
            <Text style={[styles.th, { width: "13%" }]}>المدفوع</Text>
            <Text style={[styles.th, { width: "14%" }]}>الفرق</Text>
            <Text style={[styles.th, { width: "11%" }]}>الحالة</Text>
            <Text style={[styles.th, { width: "14%" }]}>تاريخ الدفع</Text>
          </View>
          {data.neighbors.length === 0 ? (
            <Text style={styles.empty}>لا يوجد جيران نشطون</Text>
          ) : (
            data.neighbors.map((n, i) => {
              const status = statusOf(n);
              const balanceColor =
                n.balance < 0
                  ? "#d97706"
                  : n.balance > 0
                    ? "#1d4ed8"
                    : "#64748b";
              const balanceText =
                n.balance === 0
                  ? "—"
                  : n.balance < 0
                    ? `-${fmt(Math.abs(n.balance), data.currency)}`
                    : `+${fmt(n.balance, data.currency)}`;
              return (
                <View
                  key={i}
                  style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}
                >
                  <Text style={[styles.td, { width: "26%" }]}>{n.name}</Text>
                  <Text
                    style={[styles.td, { width: "9%" }, styles.tdMuted]}
                  >
                    {n.apartmentNumber ?? "—"}
                  </Text>
                  <Text style={[styles.td, { width: "13%" }]}>
                    {data.monthlyAmountSet
                      ? fmt(n.due, data.currency)
                      : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      {
                        width: "13%",
                        fontWeight: 700,
                        color: n.paid > 0 ? "#059669" : "#94a3b8",
                      },
                    ]}
                  >
                    {fmt(n.paid, data.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      {
                        width: "14%",
                        fontWeight: 700,
                        color: balanceColor,
                      },
                    ]}
                  >
                    {balanceText}
                  </Text>
                  <View
                    style={[
                      styles.td,
                      { width: "11%", paddingVertical: 4 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: status.bg, color: status.fg },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                  <Text
                    style={[styles.td, { width: "14%" }, styles.tdMuted]}
                  >
                    {n.paidAt ? fmtDate(n.paidAt) : "—"}
                  </Text>
                </View>
              );
            })
          )}
          {data.neighbors.length > 0 && (
            <View style={styles.tfoot}>
              <Text style={[styles.tfCell, { width: "35%" }]}>الإجمالي</Text>
              <Text style={[styles.tfCell, { width: "13%" }]}>
                {fmt(data.totalExpected, data.currency)}
              </Text>
              <Text
                style={[styles.tfCell, { width: "13%", color: "#059669" }]}
              >
                {fmt(data.totalCollected, data.currency)}
              </Text>
              <Text
                style={[
                  styles.tfCell,
                  { width: "14%", color: "#d97706" },
                ]}
              >
                {data.totalSurplus > 0
                  ? `+${fmt(data.totalSurplus, data.currency)} / `
                  : ""}
                {data.totalRemaining > 0
                  ? `-${fmt(data.totalRemaining, data.currency)}`
                  : "—"}
              </Text>
              <Text style={[styles.tfCell, { width: "25%" }]}> </Text>
            </View>
          )}
        </View>

        {/* Expenses section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            المصروفات ({data.expenses.length})
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "14%" }]}>التاريخ</Text>
            <Text style={[styles.th, { width: "16%" }]}>التصنيف</Text>
            <Text style={[styles.th, { width: "40%" }]}>الوصف</Text>
            <Text style={[styles.th, { width: "16%" }]}>المبلغ</Text>
            <Text style={[styles.th, { width: "14%" }]}>ملاحظات</Text>
          </View>
          {data.expenses.length === 0 ? (
            <Text style={styles.empty}>لا توجد مصروفات لهذا الشهر</Text>
          ) : (
            data.expenses.map((e, i) => (
              <View
                key={i}
                style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}
              >
                <Text style={[styles.td, { width: "14%" }, styles.tdMuted]}>
                  {fmtDate(e.expenseDate)}
                </Text>
                <Text style={[styles.td, { width: "16%" }]}>{e.category}</Text>
                <Text style={[styles.td, { width: "40%" }]}>
                  {e.description}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: "16%", fontWeight: 700, color: "#dc2626" },
                  ]}
                >
                  {fmt(e.amount, data.currency)}
                </Text>
                <Text style={[styles.td, { width: "14%" }, styles.tdMuted]}>
                  {e.notes ?? "—"}
                </Text>
              </View>
            ))
          )}
          {data.expenses.length > 0 && (
            <View style={styles.tfoot}>
              <Text style={[styles.tfCell, { width: "70%" }]}>الإجمالي</Text>
              <Text
                style={[styles.tfCell, { width: "16%", color: "#dc2626" }]}
              >
                {fmt(data.totalExpenses, data.currency)}
              </Text>
              <Text style={[styles.tfCell, { width: "14%" }]}> </Text>
            </View>
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `صفحة ${pageNumber} من ${totalPages}  •  ${data.buildingName}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
