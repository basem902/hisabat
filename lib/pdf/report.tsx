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
  // Header
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
  // Summary cards
  summaryRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 4,
    textAlign: "right",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
  },
  // Sections
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
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
  sectionCount: {
    fontSize: 9,
    color: "#64748b",
  },
  // Tables
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
  // Footer
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

export interface PaidNeighborRow {
  name: string;
  apartmentNumber: string | null;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  notes: string | null;
}

export interface UnpaidNeighborRow {
  name: string;
  apartmentNumber: string | null;
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
  totalExpenses: number;
  net: number;
  activeNeighborsCount: number;
  paid: PaidNeighborRow[];
  unpaid: UnpaidNeighborRow[];
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

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>مستحق على كل ساكن</Text>
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

        {/* Paid section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            المدفوعات ({data.paid.length} من {data.activeNeighborsCount})
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "30%" }]}>الاسم</Text>
            <Text style={[styles.th, { width: "12%" }]}>الشقة</Text>
            <Text style={[styles.th, { width: "18%" }]}>المبلغ</Text>
            <Text style={[styles.th, { width: "16%" }]}>طريقة الدفع</Text>
            <Text style={[styles.th, { width: "14%" }]}>تاريخ الدفع</Text>
            <Text style={[styles.th, { width: "10%" }]}>ملاحظات</Text>
          </View>
          {data.paid.length === 0 ? (
            <Text style={styles.empty}>لا يوجد مدفوعات لهذا الشهر</Text>
          ) : (
            data.paid.map((p, i) => (
              <View
                key={i}
                style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}
              >
                <Text style={[styles.td, { width: "30%" }]}>{p.name}</Text>
                <Text style={[styles.td, { width: "12%" }, styles.tdMuted]}>
                  {p.apartmentNumber ?? "—"}
                </Text>
                <Text style={[styles.td, { width: "18%", fontWeight: 700 }]}>
                  {fmt(p.amount, data.currency)}
                </Text>
                <Text style={[styles.td, { width: "16%" }, styles.tdMuted]}>
                  {p.paymentMethod}
                </Text>
                <Text style={[styles.td, { width: "14%" }, styles.tdMuted]}>
                  {fmtDate(p.paidAt)}
                </Text>
                <Text style={[styles.td, { width: "10%" }, styles.tdMuted]}>
                  {p.notes ?? "—"}
                </Text>
              </View>
            ))
          )}
          {data.paid.length > 0 && (
            <View style={styles.tfoot}>
              <Text style={[styles.tfCell, { width: "42%" }]}>الإجمالي</Text>
              <Text
                style={[styles.tfCell, { width: "18%", color: "#059669" }]}
              >
                {fmt(data.totalCollected, data.currency)}
              </Text>
              <Text style={[styles.tfCell, { width: "40%" }]}> </Text>
            </View>
          )}
        </View>

        {/* Unpaid section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            المتأخرون ({data.unpaid.length})
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "60%" }]}>الاسم</Text>
            <Text style={[styles.th, { width: "20%" }]}>الشقة</Text>
            <Text style={[styles.th, { width: "20%" }]}>المبلغ المستحق</Text>
          </View>
          {data.unpaid.length === 0 ? (
            <Text style={styles.empty}>الجميع دفعوا — أحسنت!</Text>
          ) : (
            data.unpaid.map((u, i) => (
              <View
                key={i}
                style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}
              >
                <Text style={[styles.td, { width: "60%" }]}>{u.name}</Text>
                <Text style={[styles.td, { width: "20%" }, styles.tdMuted]}>
                  {u.apartmentNumber ?? "—"}
                </Text>
                <Text
                  style={[styles.td, { width: "20%", color: "#d97706" }]}
                >
                  {data.monthlyAmountSet
                    ? fmt(data.monthlyAmount, data.currency)
                    : "—"}
                </Text>
              </View>
            ))
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
                  style={[styles.td, { width: "16%", fontWeight: 700, color: "#dc2626" }]}
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
