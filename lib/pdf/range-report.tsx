import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { monthName } from "@/lib/utils";
import type { RangeReportData } from "@/lib/reports";
import { ensureFont } from "./fonts";

const FONT = "CairoRange";

const styles = StyleSheet.create({
  page: { fontFamily: FONT, fontSize: 9, padding: 24, color: "#0f172a" },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  title: { fontSize: 17, fontWeight: 700, color: "#1e3a8a", textAlign: "right" },
  subtitle: { fontSize: 11, color: "#475569", marginTop: 2, textAlign: "right" },
  meta: { fontSize: 9, color: "#64748b", textAlign: "left" },
  summaryRow: {
    flexDirection: "row-reverse",
    gap: 5,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  summaryCard: {
    flex: 1,
    minWidth: 95,
    padding: 7,
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
  summaryValue: { fontSize: 12, fontWeight: 700, textAlign: "right" },
  sectionHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#f1f5f9",
    padding: 7,
    paddingHorizontal: 10,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
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
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 8,
    fontWeight: 700,
    color: "#475569",
    textAlign: "center",
  },
  tr: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  trAlt: { backgroundColor: "#fafafa" },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
    color: "#0f172a",
    textAlign: "center",
  },
  tdName: { textAlign: "right", fontWeight: 700 },
  tdMuted: { color: "#94a3b8" },
  tfoot: {
    flexDirection: "row-reverse",
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  tfCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 700,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 24,
    right: 24,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});

const fmt = (n: number, currency: string) =>
  `${n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })} ${currency}`;
const num = (n: number) =>
  n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const mk = (y: number, m: number) => y * 12 + (m - 1);

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  "لم يدفع": { bg: "#fee2e2", fg: "#991b1b" },
  متأخّر: { bg: "#fef3c7", fg: "#92400e" },
  فائض: { bg: "#dbeafe", fg: "#1e40af" },
  مكتمل: { bg: "#d1fae5", fg: "#065f46" },
};

export function RangeReport({ data }: { data: RangeReportData }) {
  ensureFont(FONT);
  const c = data.currency;
  const months = data.monthsList;
  // Matrix column widths: name + N month cols + total.
  const monthColW = `${Math.max(6, 60 / Math.max(months.length, 1))}%`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{data.buildingName}</Text>
            <Text style={styles.subtitle}>
              تقرير الفترة: {monthName(data.from.month)} {data.from.year} —{" "}
              {monthName(data.to.month)} {data.to.year}
            </Text>
          </View>
          <Text style={styles.meta}>
            تاريخ الإصدار: {fmtDate(data.generatedAt)}
          </Text>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <SummaryCard label="المتوقّع" value={fmt(data.totals.expected, c)} color="#2563eb" />
          <SummaryCard label="اشتراكات محصّلة" value={fmt(data.totals.collected, c)} color="#059669" />
          <SummaryCard label="طوارئ محصّلة" value={fmt(data.totals.emergencyCollected, c)} color="#1d4ed8" />
          {data.totals.emergencyObligation > 0 && (
            <SummaryCard
              label="طوارئ متبقّية"
              value={fmt(data.totals.emergencyOutstanding, c)}
              color={data.totals.emergencyOutstanding > 0 ? "#d97706" : "#059669"}
            />
          )}
          <SummaryCard label="المصروفات" value={fmt(data.totals.expenses, c)} color="#dc2626" />
          <SummaryCard
            label="الصافي"
            value={fmt(data.totals.net, c)}
            color={data.totals.net >= 0 ? "#059669" : "#dc2626"}
          />
          <SummaryCard label="المتبقّي" value={fmt(data.totals.outstanding, c)} color="#d97706" />
          <SummaryCard label="نسبة التحصيل" value={`${data.totals.collectionRate}%`} color="#1d4ed8" />
          <SummaryCard
            label="رصيد الصندوق"
            value={fmt(data.fund.closing, c)}
            color={data.fund.closing >= 0 ? "#059669" : "#dc2626"}
            sub={`من ${num(data.fund.opening)} (${data.fund.change >= 0 ? "+" : ""}${num(data.fund.change)})`}
          />
        </View>

        {/* Per-month breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>التفصيل الشهري</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "22%", textAlign: "right" }]}>الشهر</Text>
            <Text style={[styles.th, { width: "16%" }]}>المستحق</Text>
            <Text style={[styles.th, { width: "16%" }]}>المحصّل</Text>
            <Text style={[styles.th, { width: "16%" }]}>المصروفات</Text>
            <Text style={[styles.th, { width: "16%" }]}>الصافي</Text>
            <Text style={[styles.th, { width: "14%" }]}>نسبة التحصيل</Text>
          </View>
          {data.perMonth.map((m, i) => (
            <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}>
              <Text style={[styles.td, styles.tdName, { width: "22%" }]}>
                {monthName(m.month)} {m.year}
              </Text>
              <Text style={[styles.td, { width: "16%" }]}>{fmt(m.expected, c)}</Text>
              <Text style={[styles.td, { width: "16%", color: "#059669", fontWeight: 700 }]}>
                {fmt(m.collected, c)}
              </Text>
              <Text style={[styles.td, { width: "16%", color: "#dc2626" }]}>{fmt(m.expenses, c)}</Text>
              <Text
                style={[
                  styles.td,
                  { width: "16%", fontWeight: 700, color: m.net >= 0 ? "#059669" : "#dc2626" },
                ]}
              >
                {fmt(m.net, c)}
              </Text>
              <Text style={[styles.td, { width: "14%" }]}>{m.collectionRate}%</Text>
            </View>
          ))}
          <View style={styles.tfoot}>
            <Text style={[styles.tfCell, { width: "22%", textAlign: "right" }]}>الإجمالي</Text>
            <Text style={[styles.tfCell, { width: "16%" }]}>{fmt(data.totals.expected, c)}</Text>
            <Text style={[styles.tfCell, { width: "16%", color: "#059669" }]}>{fmt(data.totals.collected, c)}</Text>
            <Text style={[styles.tfCell, { width: "16%", color: "#dc2626" }]}>{fmt(data.totals.expenses, c)}</Text>
            <Text style={[styles.tfCell, { width: "16%", color: data.totals.net >= 0 ? "#059669" : "#dc2626" }]}>
              {fmt(data.totals.net, c)}
            </Text>
            <Text style={[styles.tfCell, { width: "14%" }]}>{data.totals.collectionRate}%</Text>
          </View>
        </View>

        {/* Payment matrix (neighbor x month) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            مصفوفة الدفعات ({data.neighbors.length} ساكن)
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>الساكن</Text>
            {months.map((m, i) => (
              <Text key={i} style={[styles.th, { width: monthColW }]}>
                {monthName(m.month).slice(0, 4)} {String(m.year).slice(2)}
              </Text>
            ))}
            <Text style={[styles.th, { width: "12%" }]}>الإجمالي</Text>
          </View>
          {data.neighbors.map((n, i) => (
            <View key={n.id} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]} wrap={false}>
              <Text style={[styles.td, styles.tdName, { width: "20%" }]}>{n.name}</Text>
              {months.map((m, j) => {
                const v = n.byMonth[mk(m.year, m.month)] ?? 0;
                return (
                  <Text
                    key={j}
                    style={[
                      styles.td,
                      { width: monthColW },
                      v > 0
                        ? { color: "#059669", fontWeight: 700 }
                        : styles.tdMuted,
                    ]}
                  >
                    {v > 0 ? num(v) : "—"}
                  </Text>
                );
              })}
              <Text style={[styles.td, { width: "12%", fontWeight: 700 }]}>
                {num(n.paid)}
              </Text>
            </View>
          ))}
          <View style={styles.tfoot}>
            <Text style={[styles.tfCell, { width: "20%", textAlign: "right" }]}>المحصّل</Text>
            {months.map((m, i) => (
              <Text key={i} style={[styles.tfCell, { width: monthColW, color: "#059669" }]}>
                {num(data.perMonth.find((p) => p.year === m.year && p.month === m.month)?.collected ?? 0)}
              </Text>
            ))}
            <Text style={[styles.tfCell, { width: "12%", color: "#059669" }]}>
              {num(data.totals.collected)}
            </Text>
          </View>
        </View>

        {/* Per-neighbor standing */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>حالة الجيران خلال الفترة</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "22%", textAlign: "right" }]}>الاسم</Text>
            <Text style={[styles.th, { width: "8%" }]}>الشقة</Text>
            <Text style={[styles.th, { width: "15%" }]}>مستحق</Text>
            <Text style={[styles.th, { width: "15%" }]}>مدفوع</Text>
            <Text style={[styles.th, { width: "15%" }]}>الرصيد</Text>
            <Text style={[styles.th, { width: "13%" }]}>طوارئ</Text>
            <Text style={[styles.th, { width: "12%" }]}>الحالة</Text>
          </View>
          {data.neighbors.map((n, i) => {
            const st = STATUS_STYLE[n.status] ?? STATUS_STYLE["لم يدفع"];
            const balText =
              n.owed > 0
                ? `-${fmt(n.owed, c)}`
                : n.surplus > 0
                  ? `+${fmt(n.surplus, c)}`
                  : "—";
            const balColor = n.owed > 0 ? "#d97706" : n.surplus > 0 ? "#1d4ed8" : "#64748b";
            const emText =
              n.emergencyObligation > 0
                ? n.emergencyOwed > 0
                  ? `-${fmt(n.emergencyOwed, c)}`
                  : "مكتمل"
                : "—";
            const emColor =
              n.emergencyObligation > 0
                ? n.emergencyOwed > 0
                  ? "#d97706"
                  : "#059669"
                : "#94a3b8";
            return (
              <View key={n.id} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]} wrap={false}>
                <Text style={[styles.td, styles.tdName, { width: "22%" }]}>{n.name}</Text>
                <Text style={[styles.td, styles.tdMuted, { width: "8%" }]}>
                  {n.apartmentNumber ?? "—"}
                </Text>
                <Text style={[styles.td, { width: "15%" }]}>{fmt(n.obligation, c)}</Text>
                <Text style={[styles.td, { width: "15%", color: n.paid > 0 ? "#059669" : "#94a3b8", fontWeight: 700 }]}>
                  {fmt(n.paid, c)}
                </Text>
                <Text style={[styles.td, { width: "15%", color: balColor, fontWeight: 700 }]}>
                  {balText}
                </Text>
                <Text style={[styles.td, { width: "13%", color: emColor, fontWeight: 700 }]}>
                  {emText}
                </Text>
                <View style={[styles.td, { width: "12%" }]}>
                  <Text style={[styles.badge, { backgroundColor: st.bg, color: st.fg }]}>
                    {n.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Emergency charges raised within the window */}
        {data.emergencyCharges.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>رسوم الطوارئ خلال الفترة</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>الرسم</Text>
                <Text style={[styles.th, { width: "14%" }]}>التاريخ</Text>
                <Text style={[styles.th, { width: "15%" }]}>المستحق</Text>
                <Text style={[styles.th, { width: "15%" }]}>المحصّل</Text>
                <Text style={[styles.th, { width: "14%" }]}>المتبقّي</Text>
                <Text style={[styles.th, { width: "12%" }]}>المسددون</Text>
              </View>
              {data.emergencyCharges.map((ch, i) => (
                <View
                  key={ch.id}
                  style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}
                  wrap={false}
                >
                  <Text style={[styles.td, styles.tdName, { width: "30%" }]}>{ch.title}</Text>
                  <Text style={[styles.td, styles.tdMuted, { width: "14%" }]}>
                    {ch.chargeDate ? fmtDate(ch.chargeDate) : "—"}
                  </Text>
                  <Text style={[styles.td, { width: "15%" }]}>{fmt(ch.obligation, c)}</Text>
                  <Text style={[styles.td, { width: "15%", color: "#059669", fontWeight: 700 }]}>
                    {fmt(ch.collected, c)}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      { width: "14%", fontWeight: 700, color: ch.outstanding > 0 ? "#d97706" : "#64748b" },
                    ]}
                  >
                    {ch.outstanding > 0 ? fmt(ch.outstanding, c) : "—"}
                  </Text>
                  <Text style={[styles.td, { width: "12%" }]}>
                    {ch.payers}/{ch.assignees}
                  </Text>
                </View>
              ))}
              <View style={styles.tfoot}>
                <Text style={[styles.tfCell, { width: "44%", textAlign: "right" }]}>الإجمالي</Text>
                <Text style={[styles.tfCell, { width: "15%" }]}>{fmt(data.totals.emergencyObligation, c)}</Text>
                <Text style={[styles.tfCell, { width: "15%", color: "#059669" }]}>{fmt(data.totals.emergencyCollected, c)}</Text>
                <Text style={[styles.tfCell, { width: "14%", color: "#d97706" }]}>{fmt(data.totals.emergencyOutstanding, c)}</Text>
                <Text style={[styles.tfCell, { width: "12%" }]}> </Text>
              </View>
            </View>
          </>
        )}

        {/* Expenses by category */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المصروفات حسب الفئة</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: "50%", textAlign: "right" }]}>الفئة</Text>
            <Text style={[styles.th, { width: "20%" }]}>عدد العمليات</Text>
            <Text style={[styles.th, { width: "30%" }]}>الإجمالي</Text>
          </View>
          {data.expensesByCategory.length === 0 ? (
            <Text style={[styles.td, { padding: 10, textAlign: "center", color: "#94a3b8" }]}>
              لا توجد مصروفات في الفترة
            </Text>
          ) : (
            data.expensesByCategory.map((e, i) => (
              <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}>
                <Text style={[styles.td, styles.tdName, { width: "50%" }]}>{e.category}</Text>
                <Text style={[styles.td, { width: "20%" }]}>{e.count}</Text>
                <Text style={[styles.td, { width: "30%", color: "#dc2626", fontWeight: 700 }]}>
                  {fmt(e.total, c)}
                </Text>
              </View>
            ))
          )}
          {data.expensesByCategory.length > 0 && (
            <View style={styles.tfoot}>
              <Text style={[styles.tfCell, { width: "70%", textAlign: "right" }]}>الإجمالي</Text>
              <Text style={[styles.tfCell, { width: "30%", color: "#dc2626" }]}>
                {fmt(data.totals.expenses, c)}
              </Text>
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

function SummaryCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      {sub && (
        <Text style={{ fontSize: 7, color: "#94a3b8", textAlign: "right", marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}
