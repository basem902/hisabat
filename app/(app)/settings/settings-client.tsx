"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, KeyRound, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsClient({
  initial,
  currentUsername,
}: {
  initial: {
    buildingName: string;
    currency: string;
  };
  currentUsername: string;
}) {
  const router = useRouter();
  const [building, setBuilding] = React.useState({
    buildingName: initial.buildingName,
    currency: initial.currency,
  });
  const [savingBuilding, setSavingBuilding] = React.useState(false);

  const [creds, setCreds] = React.useState({
    newUsername: currentUsername,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingCreds, setSavingCreds] = React.useState(false);

  async function handleSaveBuilding(e: React.FormEvent) {
    e.preventDefault();
    setSavingBuilding(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingName: building.buildingName.trim(),
          currency: building.currency.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "حدث خطأ");
        return;
      }
      toast.success("تم حفظ الإعدادات");
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSavingBuilding(false);
    }
  }

  async function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    if (creds.newPassword && creds.newPassword !== creds.confirmPassword) {
      toast.error("كلمتا السر غير متطابقتين");
      return;
    }
    if (!creds.currentPassword) {
      toast.error("أدخل كلمة السر الحالية للتأكيد");
      return;
    }

    setSavingCreds(true);
    try {
      const payload: {
        currentPassword: string;
        newUsername?: string;
        newPassword?: string;
      } = { currentPassword: creds.currentPassword };
      if (creds.newUsername && creds.newUsername !== currentUsername)
        payload.newUsername = creds.newUsername.trim();
      if (creds.newPassword) payload.newPassword = creds.newPassword;

      const res = await fetch("/api/auth/change-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "حدث خطأ");
        return;
      }
      toast.success("تم تحديث بيانات الدخول");
      setCreds({
        newUsername: data.username ?? creds.newUsername,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      router.refresh();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSavingCreds(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          إعدادات المبنى وبيانات الدخول
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            بيانات المبنى
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBuilding} className="space-y-4">
            <div>
              <Label htmlFor="buildingName">اسم المبنى</Label>
              <Input
                id="buildingName"
                required
                value={building.buildingName}
                onChange={(e) =>
                  setBuilding({ ...building, buildingName: e.target.value })
                }
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                يطهر في PDF التقارير وفي ترويسة الموقع
              </p>
            </div>
            <div>
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                required
                value={building.currency}
                onChange={(e) =>
                  setBuilding({ ...building, currency: e.target.value })
                }
                placeholder="ر.س"
                className="md:max-w-xs"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              💡 <strong>المبلغ المستحق</strong> يُحدّد لكل شهر من شاشة <strong>المدفوعات</strong> ويتطبّق على جميع السكان النشطين في ذلك الشهر.
            </p>
            <Button type="submit" disabled={savingBuilding}>
              {savingBuilding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            بيانات الدخول
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCreds} className="space-y-4">
            <div>
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={creds.newUsername}
                onChange={(e) =>
                  setCreds({ ...creds, newUsername: e.target.value })
                }
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">كلمة سر جديدة (اختياري)</Label>
              <Input
                id="newPassword"
                type="password"
                value={creds.newPassword}
                onChange={(e) =>
                  setCreds({ ...creds, newPassword: e.target.value })
                }
                autoComplete="new-password"
                minLength={4}
                placeholder="اتركها فارغة إن لم تكن تريد تغييرها"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">تأكيد كلمة السر الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={creds.confirmPassword}
                onChange={(e) =>
                  setCreds({ ...creds, confirmPassword: e.target.value })
                }
                autoComplete="new-password"
              />
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <Label htmlFor="currentPassword">
                كلمة السر الحالية (مطلوبة للتأكيد) *
              </Label>
              <Input
                id="currentPassword"
                type="password"
                required
                value={creds.currentPassword}
                onChange={(e) =>
                  setCreds({ ...creds, currentPassword: e.target.value })
                }
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={savingCreds}>
              {savingCreds ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              تحديث بيانات الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
