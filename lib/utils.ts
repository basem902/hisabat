import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ر.س") {
  return `${amount.toLocaleString("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function monthName(month: number) {
  return ARABIC_MONTHS[month - 1] ?? "";
}

/**
 * Normalize a (Saudi) phone number to international digits for wa.me links.
 * "0501234567" → "966501234567", "501234567" → "966501234567",
 * "966501234567" → unchanged. Returns "" if no digits.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return "966" + digits.slice(1);
  if (digits.length === 9 && digits.startsWith("5")) return "966" + digits;
  return digits;
}

/** Build a polite Arabic payment-reminder message for WhatsApp. */
export function buildReminderMessage(opts: {
  name: string;
  amount: string;
  months?: string;
  buildingName: string;
}): string {
  const { name, amount, months, buildingName } = opts;
  let msg = `السلام عليكم ${name}،\nتذكير ودّي بأن المبلغ المتبقّي على ذمّتكم ${amount}`;
  if (months) msg += ` عن: ${months}`;
  msg += `.\nنرجو السداد في أقرب فرصة، وجزاكم الله خيرًا.\n${buildingName}`;
  return msg;
}

/** Build a wa.me URL with a prefilled message (empty string if no number). */
export function whatsAppLink(
  phone: string | null | undefined,
  message: string
): string {
  const num = toWhatsAppNumber(phone);
  if (!num) return "";
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
