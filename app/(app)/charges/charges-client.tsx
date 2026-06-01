"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Zap,
  Plus,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";

interface Row {
  neighborId: number;
  name: string;
  apartmentNumber: string | null;
  amount: number;
  paid: boolean;
}
interface Charge {
  id: number;
  title: string;
  defaultAmount: number;
  chargeDate: string;
  notes: string | null;
  expected: number;
  collected: number;
  outstanding: number;
  paidCount: number;
  total: number;
  rows: Row[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ChargesClient({
  charges,
  currency,
}: {
  charges: Charge[];
  currency: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", amount: "", chargeDate: todayISO(), notes: "" });
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const toggle = (id: number) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function createCharge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/special-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          amount: Number(form.amount) || 0,
          chargeDate: form.chargeDate,
          notes: form.notes.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) return toast.error(d.error ?? "حدث خطأ");
      toast.success("تم إنشاء الرسم وتطبيقه على الجيران النشطين");
      setOpen(false);
      setForm({ title: "", amount: "", chargeDate: todayISO(), notes: "" });
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid(chargeId: number, r: Row) {
    setBusy(`${chargeId}:${r.neighborId}`);
    try {
      const res = await fetch(`/api/special-charges/${chargeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neighborId: r.neighborId, paid: !r.paid }),
      });
      if (!res.ok) return toast.error("تعذّر التحديث");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: Charge) {
    if (!confirm(`حذف رسم «${c.title}»؟\nسيُحذف الرسم وكل دفعاته المسجّلة (${c.paidCount} دفعة). لا يمكن التراجع.`))
      return;
    const res = await fetch(`/api/special-charges/${c.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("تعذّر الحذف");
    toast.success("تم الحذف");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            رسوم الطوارئ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            رسوم لمرّة واحدة (كهرباء، صيانة…) — مستقلة عن الاشتراك الشهري
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          رسم جديد
        </Button>
      </div>

      {charges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold mb-1">لا توجد رسوم طارئة</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              أنشئ رسمًا ليُطبّق على كل الجيران النشطين.
            </p>
          </CardContent>
        </Card>
      ) : (
        charges.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 p-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(c.defaultAmount, currency)} / ساكن •{" "}
                    {formatShortDate(c.chargeDate)} • {c.paidCount}/{c.total} دفعوا
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(c.collected, currency)}
                    </span>
                    <span className="text-slate-400"> / {formatCurrency(c.expected, currency)}</span>
                  </p>
                  {c.outstanding > 0 && (
                    <Badge variant="warning">
                      باقٍ {formatCurrency(c.outstanding, currency)}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(c)} aria-label="حذف" className="text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <button onClick={() => toggle(c.id)} className="p-2 cursor-pointer" aria-label="عرض">
                  <ChevronLeft className={cn("w-5 h-5 text-slate-400 transition-transform", expanded.has(c.id) && "-rotate-90")} />
                </button>
              </div>
              {expanded.has(c.id) && (
                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {c.rows.map((r) => (
                    <button
                      key={r.neighborId}
                      onClick={() => togglePaid(c.id, r)}
                      disabled={busy === `${c.id}:${r.neighborId}`}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-right cursor-pointer disabled:opacity-50"
                    >
                      {busy === `${c.id}:${r.neighborId}` ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      ) : r.paid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                      <span className="flex-1 min-w-0 font-medium truncate">
                        {r.name}
                        {r.apartmentNumber && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 mr-2">
                            شقة {r.apartmentNumber}
                          </span>
                        )}
                      </span>
                      <span className={cn("text-sm tabular-nums", r.paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {r.paid ? "دُفع" : "لم يدفع"} {formatCurrency(r.amount, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>رسم طارئ جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={createCharge}>
          <DialogContent className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              سيُطبّق على كل الجيران النشطين (يُجمّد المطالبون وقت الإنشاء).
            </p>
            <div>
              <Label htmlFor="t">عنوان الرسم *</Label>
              <Input id="t" required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: عدّاد الكهرباء" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="a">المبلغ لكل ساكن ({currency}) *</Label>
                <Input id="a" type="number" step="any" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="100" />
              </div>
              <div>
                <Label htmlFor="d">التاريخ *</Label>
                <Input id="d" type="date" required value={form.chargeDate} onChange={(e) => setForm({ ...form, chargeDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="n">ملاحظة</Label>
              <Textarea id="n" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              إنشاء
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
