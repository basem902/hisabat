"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  FileBarChart,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "اللوحة الرئيسية", icon: LayoutDashboard },
  { href: "/neighbors", label: "الجيران", icon: Users },
  { href: "/payments", label: "المدفوعات", icon: Wallet },
  { href: "/expenses", label: "المصروفات", icon: Receipt },
  { href: "/outstandings", label: "المتأخرات", icon: AlertCircle },
  { href: "/reports", label: "التقارير", icon: FileBarChart },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function AppShell({
  children,
  buildingName,
  username,
}: {
  children: React.ReactNode;
  buildingName: string;
  username: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 sticky top-0 h-screen">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {buildingName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حسابات المبنى
            </p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <ThemeToggle compact />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="خروج"
              aria-label="خروج"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <div className="px-2 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {username}
            </p>
            <p>متصل</p>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-safe">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-semibold truncate">{buildingName}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle compact />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 flex flex-col pt-safe">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <p className="font-semibold truncate">{buildingName}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 pb-safe">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                خروج ({username})
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 lg:p-8 pt-20 lg:pt-8 px-4 pb-8 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
