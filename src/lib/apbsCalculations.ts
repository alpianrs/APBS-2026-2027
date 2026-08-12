import {
  ApbsItem,
  ApbsSubmission,
  ApbsRecapItem,
  ApbsSummaryData,
  ApbsStatusType
} from "../types";
import { LAZUARDI_MONTHS } from "./constants";

export function calculateApbsRecap(
  items: ApbsItem[],
  submissions: ApbsSubmission[],
  currentActiveMonth: number,
  selectedMonthFilter: number | "ALL"
): ApbsRecapItem[] {
  // Get month order for overdue comparisons (Juli=1, Ags=2 ... Juni=12)
  const currentMonthOrder =
    LAZUARDI_MONTHS.find((m) => m.num === currentActiveMonth)?.order || 2;

  return items.map((item) => {
    // Filter submissions for this item
    const itemSubmissions = submissions.filter((s) => s.itemId === item.id);

    // Filtered by selected month if not ALL
    const activeSubmissions =
      selectedMonthFilter === "ALL"
        ? itemSubmissions
        : itemSubmissions.filter((s) => s.monthNum === selectedMonthFilter);

    // Total Pengajuan and Realisasi
    const totalPengajuan = activeSubmissions.reduce(
      (sum, s) => sum + (s.nominalPengajuan || 0),
      0
    );
    const totalRealisasi = activeSubmissions.reduce(
      (sum, s) => sum + (s.nominalRealisasi || 0),
      0
    );

    // Target APBS calculation
    const targetApbsTotal = item.totalApbs;
    const targetApbsFilteredMonth =
      selectedMonthFilter === "ALL"
        ? item.totalApbs
        : item.monthlyBudgets[selectedMonthFilter] || 0;

    // Remaining APBS budget
    const sisaApbs = targetApbsTotal - totalRealisasi;

    // Difference between Pengajuan and Realisasi
    const sisaDanaPengajuan = totalPengajuan - totalRealisasi;

    // Check month budget targets
    let isOverdue = false;
    let isDueThisMonth = false;

    // Evaluate monthly targets for overdue / due status
    LAZUARDI_MONTHS.forEach((m) => {
      const monthTarget = item.monthlyBudgets[m.num] || 0;
      if (monthTarget > 0) {
        const hasSubmission = itemSubmissions.some(
          (s) => s.monthNum === m.num && s.nominalPengajuan > 0
        );

        if (!hasSubmission) {
          if (m.order < currentMonthOrder) {
            isOverdue = true;
          } else if (m.num === currentActiveMonth) {
            isDueThisMonth = true;
          }
        }
      }
    });

    // Check if any active submission is pending report (LPJ)
    const isPendingReport = activeSubmissions.some(
      (s) => s.nominalPengajuan > 0 && (!s.isReported || s.nominalRealisasi === 0)
    );

    // Check if realization exceeds target APBS
    const isOverBudget =
      targetApbsTotal > 0
        ? totalRealisasi > targetApbsTotal
        : totalRealisasi > 0;

    // Status determination priority
    let status: ApbsStatusType = "BELUM_DIAJUKAN";
    let statusLabel = "Belum Diajukan";

    if (isOverBudget) {
      status = "DI_LUAR_APBS";
      statusLabel = "Di Luar APBS (Over Budget)";
    } else if (totalPengajuan > 0 && isPendingReport) {
      status = "BELUM_LAPORAN";
      statusLabel = "Belum Laporan (LPJ Pending)";
    } else if (totalPengajuan > 0 && totalRealisasi > 0) {
      if (sisaDanaPengajuan > 0) {
        status = "SISA_DANA_DIKEMBALIKAN";
        statusLabel = "Sudah Dilaporkan (Sisa Dana Kembali)";
      } else {
        status = "SUDAH_DILAPORKAN";
        statusLabel = "Sudah Dilaporkan (LPJ Selesai)";
      }
    } else if (isOverdue) {
      status = "TERLAT_APBS";
      statusLabel = "Telat APBS (Overdue)";
    } else if (isDueThisMonth && totalPengajuan === 0) {
      status = "HARUS_DIAJUKAN_BULAN_INI";
      statusLabel = "Harus Diajukan Bulan Ini";
    }

    return {
      item,
      targetApbsTotal,
      targetApbsFilteredMonth,
      totalPengajuan,
      totalRealisasi,
      sisaApbs,
      sisaDanaPengajuan,
      status,
      statusLabel,
      isOverdue,
      isDueThisMonth,
      isOverBudget,
      isPendingReport,
      submissionsForMonth: activeSubmissions
    };
  });
}

export function computeApbsSummary(recapItems: ApbsRecapItem[]): ApbsSummaryData {
  let totalApbs = 0;
  let totalPengajuan = 0;
  let totalRealisasi = 0;
  let overdueCount = 0;
  let dueThisMonthCount = 0;
  let pendingReportCount = 0;
  let overBudgetCount = 0;

  recapItems.forEach((r) => {
    totalApbs += r.targetApbsTotal;
    totalPengajuan += r.totalPengajuan;
    totalRealisasi += r.totalRealisasi;

    if (r.isOverdue) overdueCount++;
    if (r.isDueThisMonth && r.totalPengajuan === 0) dueThisMonthCount++;
    if (r.isPendingReport) pendingReportCount++;
    if (r.isOverBudget) overBudgetCount++;
  });

  const sisaApbs = totalApbs - totalRealisasi;

  return {
    totalApbs,
    totalPengajuan,
    totalRealisasi,
    sisaApbs,
    overdueCount,
    dueThisMonthCount,
    pendingReportCount,
    overBudgetCount
  };
}
