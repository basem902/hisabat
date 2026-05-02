"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Receipt,
  Paperclip,
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
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/month-picker";
import { formatCurrency, formatShortDate, monthName } from "@/lib/utils";
import type { Expense } from "@/lib/db";

const CATEGORIES = [
  "كهرباء",
  "ماء",
  "نظافة",
  "صيانة",
  "حارس",
  "مصعد",
  "إنترنت",
  "أخرى",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = () => ({
  category: CATEGORIES[0],
  description: "",
  amount: "",
  expenseDate: todayISO(),
  notes: "",
  receipt: null as File | null,
  removeExistingReceipt: false,
});

export function ExpensesClient({ currency }: { currency: string }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [list, setList] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [form, setForm] = React.useState(emptyForm());
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/expenses?year=${year}&month=${month}`);
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [year, month]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      expenseDate: e.expenseDate.slice(0, 10),
      notes: e.notes ?? "",
      receipt: null,
      removeExistingReceipt: false,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("category", form.category);
      fd.set("description", form.description);
      fd.set("amount", form.amount);
      fd.set("expenseDate", form.expenseDate);
      fd.set("notes", form.notes);
      if (form.receipt) fd.set("receipt", form.receipt);

      let res: Response;
      if (editing) {
        if (form.removeExistingReceipt) fd.set("removeReceipt", "1");
        res = await fetch(`/api/expenses/${editing.id}`, {
          method: "PATCH",
          body: fd,
        });
      } else {
        fd.set("year", String(year));
        fd.set("month", String(month));
        res = await fetch("/api/expenses", { method: "POST", body: fd });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "حدث خطأ");
        return;
      }
      toast.success(editing ? "تم التحديث" : "تمت الإضافة");
      setOpen(false);
      await load();
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: Expense) {
    if (!confirm(`حذف "${e.description}"؟`)) return;
    const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("تعذّر الحذف");
      return;
    }
    toast.success("تم الحذف");
    await load();
    router.refresh();
  }

  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCategory = list.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">المصروفات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            تسجيل مصروفات المبنى الشهرية
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            إضافة مصروف
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إجمالي مصروفات {monthName(month)} {year}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(total, currency)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {list.length} عملية
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">حسب التصنيف</p>
            {Object.keys(byCategory).length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">لا توجد مصروفات بعد</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([cat, amount]) => (
                    <div
                      key={cat}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(amount, currency)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>الوصف</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>إيصال</TableHead>
            <TableHead className="w-32">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center p-8">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400 dark:text-slate-500" />
              </TableCell>
            </TableRow>
          ) : list.length === 0 ? (
            <TableEmpty message="لا توجد مصروفات لهذا الشهر." />
          ) : (
            list.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="tabular-nums">
                  {formatShortDate(e.expenseDate)}
                </TableCell>
                <TableCell>
                  <Badge variant="info">{e.category}</Badge>
                </TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                  {e.description}
                  {e.notes && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{e.notes}</p>
                  )}
                </TableCell>
                <TableCell className="tabular-nums font-medium">
                  {formatCurrency(e.amount, currency)}
                </TableCell>
                <TableCell>
                  {e.receiptUrl ? (
                    <a
                      href={e.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      <Paperclip className="w-3 h-3" />
                      عرض
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(e)}
                      aria-label="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(e)}
                      aria-label="حذف"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل مصروف" : "إضافة مصروف"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cat">التصنيف *</Label>
                <Select
                  id="cat"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
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
            </div>
            <div>
              <Label htmlFor="desc">الوصف *</Label>
              <Input
                id="desc"
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="مثال: فاتورة كهرباء شهر مايو"
              />
            </div>
            <div>
              <Label htmlFor="date">التاريخ *</Label>
              <Input
                id="date"
                type="date"
                required
                value={form.expenseDate}
                onChange={(e) =>
                  setForm({ ...form, expenseDate: e.target.value })
                }
              />
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
                className="file:ml-3 file:rounded-md file:border-0 file:bg-slate-100 dark:bg-slate-800 file:px-3 file:py-1 file:text-xs"
              />
              {editing?.receiptUrl &&
                !form.receipt &&
                !form.removeExistingReceipt && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <a
                      href={editing.receiptUrl}
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
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                )}
              {form.removeExistingReceipt && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  سيتم حذف الإيصال الحالي عند الحفظ.
                </p>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
