import React, { useState } from "react";
import {
  History,
  X,
  Trash2,
  Edit2,
  Calendar,
  Search,
  AlertTriangle,
  FileCheck,
  Building2,
  Receipt,
  Eye,
  CheckCircle2
} from "lucide-react";
import { ApbsSubmission, ApbsItem } from "../types";
import { LAZUARDI_MONTHS } from "../lib/constants";

interface SubmissionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: ApbsSubmission[];
  items: ApbsItem[];
  onEditSubmission: (sub: ApbsSubmission) => void;
  onDeleteSubmission: (subId: string) => void;
  onOpenReportModal: (sub: ApbsSubmission, item: ApbsItem) => void;
  onOpenPurchaseDetailModal: (sub: ApbsSubmission, item: ApbsItem) => void;
  onClearAllSubmissions?: () => void;
}

export const SubmissionHistoryModal: React.FC<SubmissionHistoryModalProps> = ({
  isOpen,
  onClose,
  submissions,
  items,
  onEditSubmission,
  onDeleteSubmission,
  onOpenReportModal,
  onOpenPurchaseDetailModal,
  onClearAllSubmissions
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL");

  if (!isOpen) return null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getItemForSub = (sub: ApbsSubmission) => {
    return items.find((it) => it.id === sub.itemId) || {
      id: sub.itemId,
      rek: "REK",
      name: "Item APBS",
      kelas: "-",
      unit: "Yayasan",
      pelaksana: "Panitia",
      activity: "Operasional",
      category: "APBS",
      monthlyBudgets: {},
      totalApbs: 0,
      rowIdx: 0
    };
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const item = getItemForSub(sub);
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.rek || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.noSpkOrKwitansi || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.catatan || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth = selectedMonth === "ALL" || sub.monthNum === selectedMonth;

    return matchesSearch && matchesMonth;
  });

  const totalPengajuan = filteredSubmissions.reduce((sum, s) => sum + (s.nominalPengajuan || 0), 0);
  const totalRealisasi = filteredSubmissions.reduce((sum, s) => sum + (s.nominalRealisasi || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] px-6 py-4 text-white border-b-2 border-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Kelola & Hapus Data Pengajuan</h3>
              <p className="text-xs text-blue-200">
                Daftar semua pengajuan APBS yang tersimpan di aplikasi ({submissions.length} transaksi)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode rekening, nama kegiatan, No. SPK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-xl text-xs font-semibold px-3 py-1.5 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              <option value="ALL">Semua Bulan</option>
              {LAZUARDI_MONTHS.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <span className="text-slate-500">Total Pengajuan:</span>{" "}
              <strong className="font-mono text-blue-900 font-bold">{formatRupiah(totalPengajuan)}</strong>
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div>
              <span className="text-slate-500">Total Realisasi:</span>{" "}
              <strong className="font-mono text-emerald-800 font-bold">{formatRupiah(totalRealisasi)}</strong>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-bold text-sm text-slate-600">Tidak ada data pengajuan</p>
              <p className="text-xs text-slate-400 mt-1">
                {submissions.length === 0
                  ? "Belum ada transaksi pengajuan yang dibuat."
                  : "Tidak ada pengajuan yang cocok dengan filter pencarian."}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const item = getItemForSub(sub);
              const monthObj = LAZUARDI_MONTHS.find((m) => m.num === sub.monthNum);
              const isReported = sub.isReported || sub.nominalRealisasi > 0;
              const purchaseCount = sub.purchaseItems?.length || 0;

              return (
                <div
                  key={sub.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-2xs transition-all hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono font-extrabold text-[11px] border border-amber-400/30">
                        {item.rek || "REK"}
                      </span>
                      <span className="font-bold text-slate-900 text-xs truncate max-w-sm">
                        {item.name}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Bulan {monthObj?.name}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500">
                        Tgl: {sub.tanggalPengajuan || "-"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {sub.noSpkOrKwitansi && (
                        <span className="bg-blue-50 text-blue-900 font-mono font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200">
                          SPK: {sub.noSpkOrKwitansi}
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isReported
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-100 text-amber-950 border-amber-300"
                        }`}
                      >
                        {isReported ? "✅ LPJ Selesai" : "📋 Menunggu LPJ"}
                      </span>

                      {purchaseCount > 0 && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenPurchaseDetailModal(sub, item);
                          }}
                          className="inline-flex items-center text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                        >
                          <Receipt className="w-3 h-3 mr-1 text-amber-600" />
                          {purchaseCount} Rincian Barang
                        </button>
                      )}
                    </div>

                    {sub.catatan && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1">
                        Catatan: {sub.catatan}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500">
                        Pengajuan: <strong className="text-blue-900 font-mono font-bold">{formatRupiah(sub.nominalPengajuan)}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Realisasi: <strong className="text-slate-900 font-mono font-bold">{formatRupiah(sub.nominalRealisasi)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-200">
                      {!isReported && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenReportModal(sub, item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center shadow-2xs transition-all active:scale-95"
                          title="Isi LPJ"
                        >
                          <FileCheck className="w-3.5 h-3.5 mr-1" /> LPJ
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onClose();
                          onEditSubmission(sub);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        title="Edit Pengajuan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onDeleteSubmission(sub.id);
                        }}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:text-white hover:bg-rose-600 transition-colors"
                        title="Hapus Pengajuan Ini (PIN: 123)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0" />
            <span>Penghapusan memerlukan PIN Otorisasi (PIN: <strong>123</strong>).</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
