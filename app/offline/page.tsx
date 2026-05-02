import { WifiOff } from "lucide-react";

export const metadata = {
  title: "غير متصل",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">لا يوجد اتصال بالإنترنت</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          تأكد من اتصالك ثم حدّث الصفحة.
        </p>
      </div>
    </div>
  );
}
