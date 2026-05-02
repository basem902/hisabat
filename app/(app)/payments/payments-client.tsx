"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Loader2,
  Wallet,
  TrendingUp,
  Clock,
  Paperclip,
  ImageIcon,
  Coins,
  Edit3,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/month-picker";
import { formatCurrency, formatShortDate, monthName } from "@/lib/utils";
import type { Neighbor, Payment, MonthlyDue } from "@/lib/db";

const PAYMENT_METHODS = ["نقد", "تحويل بنكي", "STC Pay", "أخرى"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentsClient({
  neighbors,
  currency,
}: {
  neighbors: Neighbor[];
  currency: string;
}) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [due, setDue] = React.useState<MonthlyDue | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [dueOpen, setDueOpen] = React.useState(false);
  const [dueAmount, setDueAmount] = React.useState("");
  const [dueNotes, setDueNotes] = React.useState("");
  const [savingDue, setSavingDue] = React.useState(false);

  const [editing, setEditing] = React.useState<{
    neighbor: Neighbor;
    payment: Payment | null;
  } | null>(null);
  const [form, setForm] = React.useState({
    amount: "",
    paidAt: todayISO(),
    paymentMethod: "نقد",
    notes: "",
    receipt: null as File | null,
    removeExistingReceipt: false,
  });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [paymentsRes, dueRes] = await Promise.all([
      fetch(`/api/payments?year=${year}&month=${month}`),
      fetch(`/api/monthly-dues/${year}/${month}`),
    ]);
    const paymentsData = await paymentsRes.json();
    const dueData = await dueRes.json();
    setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    setDue(dueData);
    setLoading(false);
  }, [year, month]);

  React.useEffect(() => {
    load();
  }, [load]);

  const activeNeighbors = neighbors.filter((n) => n.active);
  const paymentByNeighbor = React.useMemo(() => {
    const map = new Map<number, Payment>();
    for (const p of payments) map.set(p.neighborId, p);
    return map;
  }, [payments]);

  const monthlyAmount = due?.amount ?? 0;
  const totalExpected = monthlyAmount * activeNeighbors.length;
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const paidCount = payments.length;
  const unpaidCount = activeNeighbors.length - paidCount;

  function openSetDue() {
    setDueAmount(due ? String(due.amount) : "");
    setDueNotes(due?.notes ?? "");
    setDueOpen(true);
  }

  async function handleSaveDue(e: React.FormEvent) {
    e.preventDefault();
    setSavingDue(true);
    try {
      const res = await fetch(`/api/monthly-dues/${year}/${month}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(dueAmount) || 0,
          notes: dueNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "حدث خطأ");
        return;
      }
      toast.success("تم حفظ المبلغ المستحق");
      setDue(data);
      setDueOpen(false);
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSavingDue(false);
    }
  }

  function openPayDialog(neighbor: Neighbor, payment: Payment | null) {
    if (!due && !payment) {
      toast.error("حدّد المبلغ المستحق لهذا الشهر أولاً");
      openSetDue();
      return;
    }
    setEditing({ neighbor, payment });
    if (payment) {
      setForm({
        amount: String(payment.amount),
        paidAt: payment.paidAt.slice(0, 10),
        paymentMethod: payment.paymentMethod,
        notes: payment.notes ?? "",
        receipt: null,
        removeExistingReceipt: false,
      });
    } else {
      setForm({
        amount: String(monthlyAmount),
        paidAt: todayISO(),
        paymentMethod: "نقد",
        notes: "",
        receipt: null,
        removeExistingReceipt: false,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);

    try {
      const fd = new FormData();
      fd.set("amount", form.amount);
      fd.set("paidAt", form.paidAt);
      fd.set("paymentMethod", form.paymentMethod);
      fd.set("notes", form.notes);
      if (form.receipt) fd.set("receipt", form.receipt);

      let res: Response;
      if (editing.payment) {
        if (form.removeExistingReceipt) fd.set("removeReceipt", "1");
        res = await fetch(`/api/payments/${editing.payment.id}`, {
          method: "PATCH",
          body: fd,
        });
      } else {
        fd.set("neighborId", String(editing.neighbor.id));
        fd.set("year", String(year));
        fd.set("month", String(month));
        res = await fetch("/api/payments", { method: "POST", body: fd });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "حدث خطأ");
        return;
      }

      toast.success(editing.payment ? "تم التحديث" : "تم تسجيل الدفعة");
      setEditing(null);
      await load();
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(payment: Payment) {
    if (!confirm("حذف هذه الدفعة؟")) return;
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("تعذّر الحذف");
      return;
    }
    toast.success("تم الحذف");
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">المدفوعات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            تسجيل دفعات الجيران لكل شهر
          </p>
        </div>
        <MonthPicker
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      {/* Monthly due banner */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  due
                    ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                {due ? (
                  <Coins className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  مستحق {monthName(month)} {year} على كل ساكن
                </p>
                {due ? (
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrency(due.amount, currency)}
                  </p>
                ) : (
                  <p className="text-base font-semibold text-amber-600 dark:text-amber-400">
                    لم يُحدّد بعد
                  </p>
                )}
                {due?.notes && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {due.notes}
                  </p>
                )}
              </div>
            </div>
            <Button variant={due ? "outline" : "default"} onClick={openSetDue}>
              <Edit3 className="w-4 h-4" />
              {due ? "تعديل" : "تحديد المبلغ"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          color="blue"
          label="المتوقّع"
          value={formatCurrency(totalExpected, currency)}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          label="المحصّل"
          value={formatCurrency(totalCollected, currency)}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          label="مَن دفع"
          value={`${paidCount} من ${activeNeighbors.length}`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          label="متأخّرون"
          value={String(unpaidCount)}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <h2 className="font-semibold">
            {monthName(month)} {year}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : activeNeighbors.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            لا يوجد جيران نشطون. أضف جيراناً من قائمة "الجيران".
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeNeighbors.map((n) => {
              const p = paymentByNeighbor.get(n.id);
              return (
                <NeighborPaymentRow
                  key={n.id}
                  neighbor={n}
                  payment={p ?? null}
                  monthlyAmount={monthlyAmount}
                  currency={currency}
                  onPay={() => openPayDialog(n, null)}
                  onEdit={() => openPayDialog(n, p ?? null)}
                  onDelete={() => p && handleDelete(p)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Set monthly due dialog */}
      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogHeader>
          <DialogTitle>
            تحديد المبلغ المستحق — {monthName(month)} {year}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSaveDue}>
          <DialogContent className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              المبلغ يُطبّق على كل جار نشط ({activeNeighbors.length} جار) في
              هذا الشهر.
            </p>
            <div>
              <Label htmlFor="dueAmount">المبلغ ({currency}) *</Label>
              <Input
                id="dueAmount"
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={dueAmount}
                onChange={(e) => setDueAmount(e.target.value)}
                placeholder="مثلاً 300"
              />
            </div>
            <div>
              <Label htmlFor="dueNotes">ملاحظة (اختياري)</Label>
              <Textarea
                id="dueNotes"
                rows={2}
                value={dueNotes}
                onChange={(e) => setDueNotes(e.target.value)}
                placeholder="سبب اختلاف المبلغ هذا الشهر، إن وُجد"
              />
            </div>
            {dueAmount && Number(dueAmount) > 0 && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
                إجمالي متوقّع:{" "}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(
                    Number(dueAmount) * activeNeighbors.length,
                    currency
                  )}
                </span>
              </div>
            )}
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDueOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={savingDue}>
              {savingDue && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogHeader>
          <DialogTitle>
            {editing?.payment ? "تعديل دفعة" : "تسجيل دفعة"}
            {editing && (
              <span className="text-sm text-slate-500 font-normal mr-2">
                — {editing.neighbor.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">المبلغ ({currency}) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="paidAt">تاريخ الدفع *</Label>
                <Input
                  id="paidAt"
                  type="date"
                  required
                  value={form.paidAt}
                  onChange={(e) =>
                    setForm({ ...form, paidAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="method">طريقة الدفع</Label>
              <Select
                id="method"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="receipt">إيصال (اختياري)</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) =>
                  setForm({
                    ...form,
                    receipt: e.target.files?.[0] ?? null,
                  })
                }
                className="file:ml-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs"
              />
              {editing?.payment?.receiptUrl &&
                !form.receipt &&
                !form.removeExistingReceipt && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <a
                      href={editing.payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Paperclip className="w-3 h-3" />
                      عرض الإيصال الحالي
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, removeExistingReceipt: true })
                      }
                      className="text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                )}
              {form.removeExistingReceipt && (
                <p className="mt-2 text-xs text-amber-600">
                  سيتم حذف الإيصال الحالي عند الحفظ.
                </p>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber" | "red";
  label: string;
  value: string;
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="text-base font-bold tabular-nums truncate">
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NeighborPaymentRow({
  neighbor,
  payment,
  monthlyAmount,
  currency,
  onPay,
  onEdit,
  onDelete,
}: {
  neighbor: Neighbor;
  payment: Payment | null;
  monthlyAmount: number;
  currency: string;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const paid = !!payment;
  return (
    <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <div className="shrink-0">
        {paid ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {neighbor.name}
          </p>
          {neighbor.apartmentNumber && (
            <Badge>شقة {neighbor.apartmentNumber}</Badge>
          )}
        </div>
        {paid && payment ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            دُفع{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {formatCurrency(payment.amount, currency)}
            </span>{" "}
            • {payment.paymentMethod} • {formatShortDate(payment.paidAt)}
            {payment.receiptUrl && (
              <>
                {" "}
                •{" "}
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ImageIcon className="w-3 h-3" />
                  إيصال
                </a>
              </>
            )}
            {payment.notes && (
              <span className="block text-slate-400 dark:text-slate-500 mt-0.5">
                {payment.notes}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مستحق:{" "}
            <span className="tabular-nums">
              {monthlyAmount > 0
                ? formatCurrency(monthlyAmount, currency)
                : "—"}
            </span>
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {paid ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label="تعديل"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="حذف"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button variant="success" size="sm" onClick={onPay}>
            <CheckCircle2 className="w-4 h-4" />
            تم الدفع
          </Button>
        )}
      </div>
    </div>
  );
}
