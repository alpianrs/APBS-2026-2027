export interface PurchaseItem {
  id: string;
  name: string; // Nama barang / rincian belanja
  qty: number;
  unit: string; // Satuan (pcs, rim, paket, orang, dll)
  unitPrice: number;
  totalPrice: number;
  catatan?: string;
}

export interface ApbsItem {
  id: string;
  rowIdx: number;
  kelas: string;
  unit: string;
  pelaksana: string;
  activity: string;
  category: string;
  rek: string; // Kode APBS / No. Rekening
  name: string; // Deskripsi Nama Item (Kolom G)
  monthlyBudgets: Record<number, number>; // Month num 1-12 -> budget amount
  totalApbs: number;
}

export interface ApbsSubmission {
  id: string;
  itemId: string;
  monthNum: number; // 7 (July) to 6 (June)
  nominalPengajuan: number;
  nominalRealisasi: number;
  tanggalPengajuan: string;
  tanggalLaporan?: string;
  isReported?: boolean; // True jika LPJ / Laporan Penggunaan sudah diisi
  noSpkOrKwitansi?: string;
  catatan?: string;
  submittedBy?: string;
  purchaseItems?: PurchaseItem[]; // Rincian pembelian barang/jasa
}

export interface MonthInfo {
  num: number;
  name: string;
  shortName: string;
  order: number; // 1 for July, 2 for August... 12 for June
}

export type ApbsStatusType =
  | "TERLAT_APBS" // Overdue submission
  | "HARUS_DIAJUKAN_BULAN_INI" // Due this month
  | "BELUM_LAPORAN" // Sudah diajukan tapi BELUM Laporan / LPJ Pending
  | "SUDAH_DILAPORKAN" // Sudah diajukan & dilaporkan
  | "DI_LUAR_APBS" // Over budget / Realisasi > APBS Target
  | "SISA_DANA_DIKEMBALIKAN" // Realisasi < Pengajuan
  | "BELUM_DIAJUKAN"; // Target exists in future months

export interface ApbsRecapItem {
  item: ApbsItem;
  targetApbsTotal: number;
  targetApbsFilteredMonth: number;
  totalPengajuan: number;
  totalRealisasi: number;
  sisaApbs: number; // Total APBS Target - Total Realisasi
  sisaDanaPengajuan: number; // Total Pengajuan - Total Realisasi
  status: ApbsStatusType;
  statusLabel: string;
  isOverdue: boolean;
  isDueThisMonth: boolean;
  isOverBudget: boolean;
  isPendingReport: boolean; // Has pengajuan > 0 but isReported is false or realisasi is 0
  submissionsForMonth: ApbsSubmission[];
}

export interface ApbsSummaryData {
  totalApbs: number;
  totalPengajuan: number;
  totalRealisasi: number;
  sisaApbs: number;
  overdueCount: number;
  dueThisMonthCount: number;
  pendingReportCount: number; // Jumlah item yang perlu LPJ / Belum Laporan
  overBudgetCount: number;
}

