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
      { src: path.join(process.cwd(), "lib/pdf/fonts/Cairo-Regular.ttf") },
      {
        src: path.join(process.cwd(), "lib/pdf/fonts/Cairo-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: { fontFamily: "Cairo", fontSize: 10, padding: 32, color: "#0f172a" },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  title: { fontSize: 18, fontWeight: 700, color: "#1e3a8a", textAlign: "right" },
  subtitle: { fontSize: 11, color: "#475569", marginTop: 2, textAlign: "right" },
  meta: { fontSize: 9, color: "#64748b", textAlign: "left" },
  infoRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  infoText: { fontSize: 10, color: "#475569", textAlign: "right" },
  summaryRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  summaryCard: {
    flex: 1,
    minWidth: 110,
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
  summaryValue: { fontSize: 13, fontWeight: 700, textAlign: "right" },
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
  trAlt: { backgroundColor: "#fafafa" },
  td: { padding: 6, fontSize: 9, color: "#0f172a", textAlign: "right" },
  tdMuted: { color: "#64748b" },
  empty: {
    padding: 12,
    textAlign: "center",
    fontSize: 10,
    color: "#94a3b8",
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

export interface StatementMonthRow {
  year: number;
  month: number;
  due: number;
  paid: number;
  running: number;
}

export interface StatementPaymentRow {
  year: number;
  month: number;
  amount: number;
  paidAt: string;
  paymentMethod: string;
}

export interface StatementData {
  buildingName: string;
  currency: string;
  name: string;
  apartmentNumber: string | null;
  phone: string | null;
  active: boolean;
  obligation: number;
  totalPaid: number;
  owed: number;
  surplus: number;
  monthLabel: (m: number) => string;
  months: StatementMonthRow[];
  payments: StatementPaymentRow[];
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

export function NeighborStatement({ data }: { data: StatementData }) {
  ensureFonts();
  const ml = data.monthLabel;
  const balanceLabel =
    data.owed > 0 ? "الباقي عليه" : data.surplus > 0 ? "فائض (دفع مقدّم)" : "الحالة";
  const balanceValue =
    data.owed > 0
      ? fmt(data.owed, data.currency)
      : data.surplus > 0
        ? fmt(data.surplus, data.currency)
        : "مكتمل";
  const balanceColor =
    data.owed > 0 ? "#d97706" : data.surplus > 0 ? "#1d4ed8" : "#059669";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{data.buildingName}</Text>
            <Text style={styles.subtitle}>كشف حساب — {data.name}</Text>
          </View>
          <Text style={styles.meta}>
            تاريخ الإصدار: {fmtDate(data.generatedAt)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            الشقة: {data.apartmentNumber ?? "—"}
          </Text>
          <Text style={styles.infoText}>الجوال: {data.phone ?? "—"}</Text>
          <Text style={styles.infoText}>
            الحالة: {data.active ? "نشط" : "غير نشط"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>إجمالي المستحق</Text>
            <Text style={[styles.summaryValue, { color: "#2563eb" }]}>
              {fmt(data.obligation, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>إجمالي المدفوع</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>
              {fmt(data.totalPaid, data.currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{balanceLabel}</Text>
            <Text style={[styles.summaryValue, { color: balanceColor }]}>
              {balanceValue}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            السجل الشهري ({data.months.length})
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "28%" }]}>الشهر</Text>
            <Text style={[styles.th, { width: "24%" }]}>المستحق</Text>
            <Text style={[styles.th, { width: "24%" }]}>المدفوع</Text>
            <Text style={[styles.th, { width: "24%" }]}>الرصيد الجاري</Text>
          </View>
          {data.months.length === 0 ? (
            <Text style={styles.empty}>لا توجد حركة بعد</Text>
          ) : (
            data.months.map((m, i) => {
              const runColor =
                m.running < 0 ? "#d97706" : m.running > 0 ? "#1d4ed8" : "#64748b";
              const runText =
                m.running === 0
                  ? "—"
                  : m.running < 0
                    ? `-${fmt(Math.abs(m.running), data.currency)}`
                    : `+${fmt(m.running, data.currency)}`;
              return (
                <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}>
                  <Text style={[styles.td, { width: "28%" }]}>
                    {ml(m.month)} {m.year}
                  </Text>
                  <Text style={[styles.td, { width: "24%" }]}>
                    {m.due > 0 ? fmt(m.due, data.currency) : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      {
                        width: "24%",
                        color: m.paid > 0 ? "#059669" : "#94a3b8",
                        fontWeight: 700,
                      },
                    ]}
                  >
                    {m.paid > 0 ? fmt(m.paid, data.currency) : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      { width: "24%", color: runColor, fontWeight: 700 },
                    ]}
                  >
                    {runText}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            الدفعات ({data.payments.length})
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "24%" }]}>الشهر</Text>
            <Text style={[styles.th, { width: "24%" }]}>المبلغ</Text>
            <Text style={[styles.th, { width: "28%" }]}>التاريخ</Text>
            <Text style={[styles.th, { width: "24%" }]}>الطريقة</Text>
          </View>
          {data.payments.length === 0 ? (
            <Text style={styles.empty}>لا توجد دفعات مسجّلة</Text>
          ) : (
            data.payments.map((p, i) => (
              <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}>
                <Text style={[styles.td, { width: "24%" }]}>
                  {ml(p.month)} {p.year}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: "24%", color: "#059669", fontWeight: 700 },
                  ]}
                >
                  {fmt(p.amount, data.currency)}
                </Text>
                <Text style={[styles.td, { width: "28%" }, styles.tdMuted]}>
                  {fmtDate(p.paidAt)}
                </Text>
                <Text style={[styles.td, { width: "24%" }, styles.tdMuted]}>
                  {p.paymentMethod}
                </Text>
              </View>
            ))
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
