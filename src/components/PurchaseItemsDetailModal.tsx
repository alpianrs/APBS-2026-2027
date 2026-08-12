import React from "react";
import { X, ShoppingBag, Calendar, FileText, CheckCircle2, Clock, DollarSign, User } from "lucide-react";
import { ApbsSubmission, ApbsItem } from "../types";
import { LAZUARDI_MONTHS, formatRupiah } from "../lib/constants";

interface PurchaseItemsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: ApbsSubmission | null;
  item: ApbsItem | null;
  onOpenReportModal?: (submission: ApbsSubmission) => void;
}

export const PurchaseItemsDetailModal: React.FC<PurchaseItemsDetailModalProps> = ({
  isOpen,
  onClose,
  submission,
  item,
  onOpenReportModal
}) => {
  if (!isOpen || !submission || !item) return null;

  const monthObj = LAZUARDI_MONTHS.find((m) => m.num === submission.monthNum);
  const purchaseList = submission.purchaseItems || [];
  const isReported = submission.isReported || submission.nominalRealisasi > 0;

  const totalCalculatedFromList = purchaseList.reduce(
    (sum, p) => sum + (p.totalPrice || p.qty * p.unitPrice || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Navy & Gold Accent */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Rincian Item Pembelian / Belanja APBS
              </h3>
              <p className="text-xs text-amber-200/90 font-medium">
                Kode APBS: <span className="font-mono font-bold text-amber-300">{item.rek || "Tanpa Rekening"}</span> | Unit: {item.unit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700">
          
          {/* Item Meta Summary Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>{item.name}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isReported
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}>
                {isReported ? "✅ LPJ Dilaporkan" : "📋 Belum Laporan (LPJ Pending)"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] border-t border-slate-200/80">
              <div>
                <span className="text-slate-500 block">Bulan Periode:</span>
                <span className="font-bold text-slate-800 flex items-center mt-0.5">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  {monthObj?.name} (Ke-{monthObj?.order})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tgl Pengajuan:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {submission.tanggalPengajuan || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">No. SPK / Kwitansi:</span>
                <span className="font-mono font-bold text-blue-900 mt-0.5 block">
                  {submission.noSpkOrKwitansi || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pengaju / Petugas:</span>
                <span className="font-semibold text-slate-800 flex items-center mt-0.5">
                  <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {submission.submittedBy || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Nominal Financial Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
              <span className="text-blue-700 font-medium block text-[11px]">Nominal Diajukan (Proposal):</span>
              <span className="text-lg font-extrabold text-[#0F2C59]">
                {formatRupiah(submission.nominalPengajuan)}
              </span>
            </div>

            <div className={`p-3 border rounded-xl ${
              isReported
                ? "bg-emerald-50/80 border-emerald-200"
                : "bg-amber-50/80 border-amber-200"
            }`}>
              <span className="font-medium block text-[11px] text-slate-600">
                Nominal Realisasi Actual (LPJ):
              </span>
              <span className={`text-lg font-extrabold ${isReported ? "text-emerald-800" : "text-amber-800"}`}>
                {isReported ? formatRupiah(submission.nominalRealisasi) : "Belum Ada Realisasi (0)"}
              </span>
            </div>
          </div>

          {/* Rincian Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center">
                <ShoppingBag className="w-4 h-4 mr-1.5 text-amber-600" />
                Daftar Rincian Barang / Jasa Yang Dibeli ({purchaseList.length} item):
              </h4>
              {totalCalculatedFromList > 0 && (
                <span className="text-[11px] font-semibold text-slate-600">
                  Subtotal Rincian: <strong className="text-slate-900">{formatRupiah(totalCalculatedFromList)}</strong>
                </span>
              )}
            </div>

            {purchaseList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500">
                <p className="font-medium text-xs">Belum ada rincian barang/jasa rincian pembelian yang ditambahkan.</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Saat membuat laporan LPJ, Anda dapat menambahkan rincian per barang.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0F2C59] text-white font-bold text-[11px]">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Rincian Barang / Jasa</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-center">Satuan</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {purchaseList.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {p.name}
                          {p.catatan && (
                            <span className="block text-[10px] text-slate-500 font-normal">{p.catatan}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-700">{p.qty}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{p.unit || "Pcs"}</td>
                        <td className="py-2 px-3 text-right text-slate-700 font-mono">
                          {formatRupiah(p.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatRupiah(p.totalPrice || p.qty * p.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 font-bold border-t border-amber-200 text-slate-900">
                      <td colSpan={5} className="py-2.5 px-3 text-right">
                        Total Rincian Pembelian:
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-900 text-sm font-extrabold font-mono">
                        {formatRupiah(totalCalculatedFromList)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Notes / Catatan */}
          {submission.catatan && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Catatan / Keterangan Tambahan:</span>
              <p className="text-slate-600 leading-relaxed italic">{submission.catatan}</p>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors text-xs"
          >
            Tutup
          </button>

          {!isReported && onOpenReportModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReportModal(submission);
              }}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl transition-all shadow text-xs flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Isi Laporan LPJ Sekarang</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
