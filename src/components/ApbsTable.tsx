import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  Edit2,
  Trash2,
  FileCheck,
  ShoppingBag,
  Eye,
  ArrowDownCircle
} from "lucide-react";
import { ApbsRecapItem, ApbsSubmission, ApbsItem } from "../types";
import { formatRupiah, LAZUARDI_MONTHS } from "../lib/constants";

interface ApbsTableProps {
  recapItems: ApbsRecapItem[];
  onOpenSubmissionForItem: (recap: ApbsRecapItem) => void;
  onOpenReportModal: (sub: ApbsSubmission, item: ApbsItem) => void;
  onOpenPurchaseDetailModal: (sub: ApbsSubmission, item: ApbsItem) => void;
  onEditSubmission: (sub: ApbsSubmission) => void;
  onDeleteSubmission: (subId: string) => void;
}

type SortField = "rek" | "name" | "targetApbsTotal" | "totalPengajuan" | "totalRealisasi" | "sisaApbs" | "status";

export const ApbsTable: React.FC<ApbsTableProps> = ({
  recapItems,
  onOpenSubmissionForItem,
  onOpenReportModal,
  onOpenPurchaseDetailModal,
  onEditSubmission,
  onDeleteSubmission
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "ALL">(15);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Sort items
  const sortedItems = [...recapItems].sort((a, b) => {
    let valA: any = a.item.name;
    let valB: any = b.item.name;

    if (sortField === "rek") {
      valA = a.item.rek || "";
      valB = b.item.rek || "";
    } else if (sortField === "targetApbsTotal") {
      valA = a.targetApbsTotal;
      valB = b.targetApbsTotal;
    } else if (sortField === "totalPengajuan") {
      valA = a.totalPengajuan;
      valB = b.totalPengajuan;
    } else if (sortField === "totalRealisasi") {
      valA = a.totalRealisasi;
      valB = b.totalRealisasi;
    } else if (sortField === "sisaApbs") {
      valA = a.sisaApbs;
      valB = b.sisaApbs;
    } else if (sortField === "status") {
      valA = a.status;
      valB = b.status;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const effectiveItemsPerPage = itemsPerPage === "ALL" ? (sortedItems.length || 1) : itemsPerPage;
  const totalPages = Math.ceil(sortedItems.length / effectiveItemsPerPage) || 1;
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * effectiveItemsPerPage,
    currentPage * effectiveItemsPerPage
  );

  // Grand totals for current filtered recap items
  const totalPlafond = recapItems.reduce((acc, curr) => acc + curr.targetApbsTotal, 0);
  const totalPengajuan = recapItems.reduce((acc, curr) => acc + curr.totalPengajuan, 0);
  const totalRealisasi = recapItems.reduce((acc, curr) => acc + curr.totalRealisasi, 0);
  const totalSisa = recapItems.reduce((acc, curr) => acc + curr.sisaApbs, 0);

  const scrollToTotal = () => {
    document.getElementById("total-apbs-footer")?.scrollIntoView({ behavior: "smooth" });
  };

  const renderStatusBadge = (r: ApbsRecapItem) => {
    switch (r.status) {
      case "DI_LUAR_APBS":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300 shadow-xs">
            <AlertTriangle className="w-3 h-3 mr-1 text-purple-700" />
            Di Luar APBS
          </span>
        );
      case "BELUM_LAPORAN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-950 border border-amber-400 shadow-xs">
            <FileCheck className="w-3 h-3 mr-1 text-amber-800" />
            Belum Laporan (LPJ)
          </span>
        );
      case "SUDAH_DILAPORKAN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-xs">
            <CheckCircle2 className="w-3 h-3 mr-1 text-blue-700" />
            Sudah Dilaporkan
          </span>
        );
      case "TERLAT_APBS":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-xs animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            Telat APBS
          </span>
        );
      case "HARUS_DIAJUKAN_BULAN_INI":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300 shadow-xs">
            <Clock className="w-3 h-3 mr-1 text-yellow-800" />
            Target Bulan Ini
          </span>
        );
      case "SISA_DANA_DIKEMBALIKAN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
            LPJ (Sisa Kembali)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Belum Diajukan
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden mb-8">
      
      {/* Table Control Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#0F2C59]" />
          <h3 className="font-extrabold text-slate-900 text-sm">
            Rincian Detail APBS Lazuardi
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
            {sortedItems.length} Item
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Scroll Directly to Total APBS Button */}
          <button
            onClick={scrollToTotal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#0F2C59] to-blue-900 text-amber-300 hover:from-slate-800 hover:to-blue-800 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer border border-amber-400/40"
            title="Klik untuk langsung menuju Seluruh Total APBS di bagian bawah"
          >
            <ArrowDownCircle className="w-4 h-4 text-amber-400" />
            <span>Seluruh Total APBS (Langsung ke Bawah)</span>
          </button>

          {/* Items Per Page Selector */}
          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs">
            <span>Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={15}>15 Item per Halaman</option>
              <option value={30}>30 Item per Halaman</option>
              <option value={50}>50 Item per Halaman</option>
              <option value="ALL">Semua ({sortedItems.length} Item - Seluruh APBS)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] text-white border-b-2 border-amber-400">
              <th className="py-3.5 px-2 w-8"></th>
              <th
                onClick={() => handleSort("rek")}
                className="py-3.5 px-3 font-bold text-amber-300 cursor-pointer hover:text-white w-28"
              >
                <div className="flex items-center space-x-1">
                  <span>Kode APBS</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th
                onClick={() => handleSort("name")}
                className="py-3.5 px-3 font-bold cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center space-x-1">
                  <span>Deskripsi Nama Item (Kolom G)</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th
                onClick={() => handleSort("targetApbsTotal")}
                className="py-3.5 px-3 font-bold text-right cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Plafond APBS</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th
                onClick={() => handleSort("totalPengajuan")}
                className="py-3.5 px-3 font-bold text-right cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Pengajuan</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th
                onClick={() => handleSort("totalRealisasi")}
                className="py-3.5 px-3 font-bold text-right cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Realisasi LPJ</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th
                onClick={() => handleSort("sisaApbs")}
                className="py-3.5 px-3 font-bold text-right cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Sisa Plafond</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th
                onClick={() => handleSort("status")}
                className="py-3.5 px-3 font-bold text-center cursor-pointer hover:text-amber-300"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Status APBS</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-300/80" />
                </div>
              </th>
              <th className="py-3.5 px-3 font-bold text-center w-36">Aksi & Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                  Tidak ditemukan data APBS yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              paginatedItems.map((r) => {
                const isExpanded = !!expandedRows[r.item.id];
                const pendingSub = r.submissionsForMonth.find((s) => s.nominalPengajuan > 0 && (!s.isReported || s.nominalRealisasi === 0));

                return (
                  <React.Fragment key={r.item.id}>
                    <tr
                      className={`hover:bg-amber-50/30 transition-colors ${
                        r.isPendingReport
                          ? "bg-amber-50/60"
                          : r.isOverdue
                          ? "bg-rose-50/40"
                          : r.isOverBudget
                          ? "bg-purple-50/40"
                          : ""
                      }`}
                    >
                      {/* Expand Button */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleRow(r.item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#0F2C59] hover:bg-slate-200 transition-colors"
                          title="Lihat Jadwal Bulanan & Log Pengajuan"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#0F2C59] font-bold" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Kode APBS / No. Rekening */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono font-extrabold text-[11px] shadow-2xs border border-amber-400/30">
                          {r.item.rek || `REK-${r.item.rowIdx}`}
                        </span>
                      </td>

                      {/* Deskripsi Nama Item (Kolom G) */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 leading-snug">
                          {r.item.name}
                        </div>
                      </td>

                      {/* Plafond APBS Target */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatRupiah(r.targetApbsTotal)}
                      </td>

                      {/* Nominal Pengajuan */}
                      <td className="py-3 px-3 text-right font-extrabold text-blue-800 font-mono">
                        {formatRupiah(r.totalPengajuan)}
                      </td>

                      {/* Nominal Realisasi */}
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900 font-mono">
                        {formatRupiah(r.totalRealisasi)}
                      </td>

                      {/* Sisa APBS */}
                      <td
                        className={`py-3 px-3 text-right font-black font-mono ${
                          r.sisaApbs < 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {formatRupiah(r.sisaApbs)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {renderStatusBadge(r)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          
                          {/* If item has pending submission LPJ, offer Lapor LPJ button */}
                          {pendingSub ? (
                            <button
                              onClick={() => onOpenReportModal(pendingSub, r.item)}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shadow-xs transition-transform active:scale-95"
                              title="Isi Laporan Realisasi LPJ"
                            >
                              <FileCheck className="w-3.5 h-3.5 mr-1" />
                              <span>Lapor LPJ</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenSubmissionForItem(r)}
                              className="inline-flex items-center px-2 py-1 rounded-lg bg-[#0F2C59] hover:bg-[#1E3A8A] text-white font-bold text-[11px] shadow-xs transition-colors"
                              title="Buat Pengajuan APBS Baru"
                            >
                              <PlusCircle className="w-3.5 h-3.5 mr-1 text-amber-300" />
                              <span>+ Ajukan</span>
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>

                    {/* Expandable Details Row */}
                    {isExpanded && (
                      <tr className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-amber-50/20 border-b border-slate-200">
                        <td colSpan={10} className="p-4">
                          <div className="space-y-4">
                            
                            {/* Monthly Schedule Grid (Juli - Juni) */}
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 flex items-center mb-2">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-800" />
                                Target Pengajuan APBS Bulanan (Juli - Juni) - Kode: <span className="font-mono ml-1 text-amber-800 font-extrabold">{r.item.rek}</span>:
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                                {LAZUARDI_MONTHS.map((m) => {
                                  const targetVal = r.item.monthlyBudgets[m.num] || 0;
                                  const monthSubs = r.submissionsForMonth.filter(
                                    (s) => s.monthNum === m.num
                                  );
                                  const monthRealized = monthSubs.reduce(
                                    (sum, s) => sum + s.nominalRealisasi,
                                    0
                                  );

                                  return (
                                    <div
                                      key={m.num}
                                      className={`p-2 rounded-xl border ${
                                        targetVal > 0
                                          ? "bg-white border-slate-300 shadow-2xs"
                                          : "bg-slate-100/60 border-slate-200 text-slate-400"
                                      }`}
                                    >
                                      <div className="font-bold text-slate-800 flex justify-between items-center">
                                        <span>{m.name}</span>
                                        <span className="text-[10px] text-slate-400">
                                          B{m.order}
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-bold text-blue-900 mt-1">
                                        Target: {formatRupiah(targetVal)}
                                      </div>
                                      {monthRealized > 0 && (
                                        <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                          Real: {formatRupiah(monthRealized)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Logged Submissions History */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs font-bold text-slate-800 flex items-center">
                                  <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-800" />
                                  Riwayat Catatan Pengajuan & LPJ Realisasi:
                                </h5>

                                <button
                                  onClick={() => onOpenSubmissionForItem(r)}
                                  className="text-[11px] font-bold text-blue-900 hover:text-amber-700 underline flex items-center"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Buat Pengajuan Baru
                                </button>
                              </div>

                              {r.submissionsForMonth.length === 0 ? (
                                <p className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-slate-200">
                                  Belum ada catatan pengajuan untuk item ini.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {r.submissionsForMonth.map((sub) => {
                                    const monthObj = LAZUARDI_MONTHS.find(
                                      (m) => m.num === sub.monthNum
                                    );
                                    const isReported = sub.isReported || sub.nominalRealisasi > 0;
                                    const purchaseCount = sub.purchaseItems?.length || 0;

                                    return (
                                      <div
                                        key={sub.id}
                                        className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-2xs hover:border-blue-300 transition-colors"
                                      >
                                        <div className="space-y-1">
                                          <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                                            <span className="text-[#0F2C59]">Bulan {monthObj?.name}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-600">Tgl Pengajuan: {sub.tanggalPengajuan}</span>
                                            
                                            {sub.noSpkOrKwitansi && (
                                              <span className="bg-blue-50 text-blue-900 font-mono font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200">
                                                {sub.noSpkOrKwitansi}
                                              </span>
                                            )}

                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                              isReported
                                                ? "bg-blue-50 text-blue-900 border-blue-200"
                                                : "bg-amber-100 text-amber-950 border-amber-300"
                                            }`}>
                                              {isReported ? "✅ LPJ Selesai" : "📋 Belum Laporan (LPJ)"}
                                            </span>
                                          </div>

                                          {sub.catatan && (
                                            <div className="text-slate-600 text-[11px] italic">
                                              Catatan: {sub.catatan}
                                            </div>
                                          )}

                                          {purchaseCount > 0 && (
                                            <button
                                              onClick={() => onOpenPurchaseDetailModal(sub, r.item)}
                                              className="mt-1 inline-flex items-center text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-300"
                                            >
                                              <ShoppingBag className="w-3 h-3 mr-1 text-amber-600" />
                                              Lihat Rincian Pembelian ({purchaseCount} item)
                                            </button>
                                          )}
                                        </div>

                                        <div className="flex items-center space-x-3 self-end sm:self-center">
                                          <div className="text-right">
                                            <div className="text-slate-600 text-[11px]">
                                              Proposal: <strong className="text-blue-800 font-mono">{formatRupiah(sub.nominalPengajuan)}</strong>
                                            </div>
                                            <div className="text-slate-600 text-[11px]">
                                              LPJ Actual: <strong className="text-slate-900 font-mono">{formatRupiah(sub.nominalRealisasi)}</strong>
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                                            {!isReported && (
                                              <button
                                                onClick={() => onOpenReportModal(sub, r.item)}
                                                className="px-2 py-1 rounded bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center shadow-2xs"
                                                title="Isi LPJ / Laporan Penggunaan"
                                              >
                                                <FileCheck className="w-3 h-3 mr-1" /> LPJ
                                              </button>
                                            )}

                                            <button
                                              onClick={() => onOpenPurchaseDetailModal(sub, r.item)}
                                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-700"
                                              title="Lihat Detail Rincian Pembelian"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                              onClick={() => onEditSubmission(sub)}
                                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-700"
                                              title="Edit Catatan Pengajuan"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                              onClick={() => onDeleteSubmission(sub.id)}
                                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-rose-600"
                                              title="Hapus Pengajuan"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Grand Total APBS Footer Row */}
          <tfoot id="total-apbs-footer" className="bg-slate-900 text-white font-bold border-t-4 border-amber-400 shadow-md">
            <tr>
              <td colSpan={3} className="py-4 px-4 text-left">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0"></div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-amber-300 font-extrabold">
                      SELURUH TOTAL APBS ({recapItems.length} Item)
                    </div>
                    <div className="text-[10px] text-slate-300 font-normal">
                      Total Kumulatif dari Seluruh Anggaran & Pengajuan APBS
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-3 text-right font-mono text-sm text-white font-black">
                {formatRupiah(totalPlafond)}
              </td>
              <td className="py-4 px-3 text-right font-mono text-sm text-blue-300 font-black">
                {formatRupiah(totalPengajuan)}
              </td>
              <td className="py-4 px-3 text-right font-mono text-sm text-amber-300 font-black">
                {formatRupiah(totalRealisasi)}
              </td>
              <td
                className={`py-4 px-3 text-right font-mono text-sm font-black ${
                  totalSisa < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatRupiah(totalSisa)}
              </td>
              <td colSpan={2} className="py-4 px-3 text-center text-xs text-amber-300/90 font-extrabold">
                Grand Total APBS
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Halaman <strong className="text-slate-900">{currentPage}</strong> dari{" "}
            <strong className="text-slate-900">{totalPages}</strong> (Total {sortedItems.length} item APBS)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
