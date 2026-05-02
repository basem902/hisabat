"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hisabat-install-dismissed";
const DISMISS_DAYS = 14;

export function PwaInstaller() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    // Don't show prompt if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const date = new Date(dismissed);
      const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
      setDeferred(null);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setShow(false);
  }

  if (!show || !deferred) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 lg:bottom-6 lg:right-6 lg:left-auto lg:max-w-sm z-40 animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">ثبّت التطبيق</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            للوصول السريع كأنه تطبيق على جهازك
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
            >
              تثبيت
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-md text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              ليس الآن
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
