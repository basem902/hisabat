"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Phone,
  UserCheck,
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
import type { Neighbor } from "@/lib/db";

type FormState = {
  name: string;
  apartmentNumber: string;
  phone: string;
  active: boolean;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  apartmentNumber: "",
  phone: "",
  active: true,
  notes: "",
});

export function NeighborsClient({ initial }: { initial: Neighbor[] }) {
  const router = useRouter();
  const [list, setList] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Neighbor | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(n: Neighbor) {
    setEditing(n);
    setForm({
      name: n.name,
      apartmentNumber: n.apartmentNumber ?? "",
      phone: n.phone ?? "",
      active: n.active,
      notes: n.notes ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      apartmentNumber: form.apartmentNumber.trim() || null,
      phone: form.phone.trim() || null,
      active: form.active,
      notes: form.notes.trim() || null,
    };

    try {
      const res = editing
        ? await fetch(`/api/neighbors/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/neighbors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "حدث خطأ");
        setSaving(false);
        return;
      }

      if (editing) {
        setList((prev) => prev.map((n) => (n.id === data.id ? data : n)));
        toast.success("تم تحديث الجار");
      } else {
        setList((prev) =>
          [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "ar"))
        );
        toast.success("تمت إضافة الجار");
      }
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(n: Neighbor) {
    if (!confirm(`حذف ${n.name}؟ سيتم حذف كل مدفوعاته أيضاً.`)) return;
    const res = await fetch(`/api/neighbors/${n.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("تعذّر الحذف");
      return;
    }
    setList((prev) => prev.filter((x) => x.id !== n.id));
    toast.success("تم الحذف");
    router.refresh();
  }

  const totalActive = list.filter((n) => n.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">الجيران</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة قائمة الجيران (المبلغ المستحق يُحدّد لكل شهر من شاشة المدفوعات)
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          إضافة جار
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إجمالي الجيران
                </p>
                <p className="text-xl font-bold tabular-nums">{list.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  النشطين (يُحسبون شهرياً)
                </p>
                <p className="text-xl font-bold tabular-nums">{totalActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>رقم الشقة</TableHead>
            <TableHead>الجوال</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="w-32">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 && (
            <TableEmpty message="لا توجد بيانات بعد. أضف أول جار." />
          )}
          {list.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                {n.name}
                {n.notes && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {n.notes}
                  </p>
                )}
              </TableCell>
              <TableCell>{n.apartmentNumber ?? "—"}</TableCell>
              <TableCell>
                {n.phone ? (
                  <a
                    href={`tel:${n.phone}`}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {n.phone}
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {n.active ? (
                  <Badge variant="success">نشط</Badge>
                ) : (
                  <Badge>غير نشط</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(n)}
                    aria-label="تعديل"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(n)}
                    aria-label="حذف"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل جار" : "إضافة جار"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <div>
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="apt">رقم الشقة</Label>
                <Input
                  id="apt"
                  value={form.apartmentNumber}
                  onChange={(e) =>
                    setForm({ ...form, apartmentNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone">الجوال</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="05xxxxxxxx"
                />
              </div>
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
              />
              <span className="text-sm">
                نشط (يُحسب ضمن جيران الشهر)
              </span>
            </label>
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
