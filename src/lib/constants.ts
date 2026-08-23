import { MonthInfo } from "../types";

// Default Google Apps Script Web App URL for automated Sheet logging
export const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbx3HhPFgplKFWXiPOqiyAmf1y38c-GEjqq73lX5SZSuwEN2k-QSQEhL3iN_aaf863K7/exec";

// Academic Year Lazuardi APBS Period: July (7) to June (6)
export const LAZUARDI_MONTHS: MonthInfo[] = [
  { num: 7, name: "Juli", shortName: "Jul", order: 1 },
  { num: 8, name: "Agustus", shortName: "Agu", order: 2 },
  { num: 9, name: "September", shortName: "Sep", order: 3 },
  { num: 10, name: "Oktober", shortName: "Okt", order: 4 },
  { num: 11, name: "November", shortName: "Nov", order: 5 },
  { num: 12, name: "Desember", shortName: "Des", order: 6 },
  { num: 1, name: "Januari", shortName: "Jan", order: 7 },
  { num: 2, name: "Februari", shortName: "Feb", order: 8 },
  { num: 3, name: "Maret", shortName: "Mar", order: 9 },
  { num: 4, name: "April", shortName: "Apr", order: 10 },
  { num: 5, name: "Mei", shortName: "Mei", order: 11 },
  { num: 6, name: "Juni", shortName: "Jun", order: 12 }
];

export function getMonthInfo(monthNum: number): MonthInfo {
  return (
    LAZUARDI_MONTHS.find((m) => m.num === monthNum) || {
      num: monthNum,
      name: `Bulan ${monthNum}`,
      shortName: `B${monthNum}`,
      order: 99
    }
  );
}

// Format numbers into Indonesian Rupiah format
export function formatRupiah(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rp 0";
  const formatted = Math.abs(amount).toLocaleString("id-ID");
  if (amount < 0) {
    return `-Rp ${formatted}`;
  }
  return `Rp ${formatted}`;
}

// Get current school academic month (e.g. August = month 8)
export function getCurrentSchoolMonth(): number {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  // Default to August (8) if current calendar month matches or fallback
  return currentMonth;
}
