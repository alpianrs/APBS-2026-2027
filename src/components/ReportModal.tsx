import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, FileCheck, ShoppingBag, Calculator, AlertTriangle } from "lucide-react";
import { ApbsSubmission, ApbsItem, PurchaseItem } from "../types";
import { LAZUARDI_MONTHS, formatRupiah } from "../lib/constants";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: ApbsSubmission | null;
  item: ApbsItem | null;
  onSaveReport: (updatedSubmission: ApbsSubmission) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  submission,
  item,
  onSaveReport
}) => {
  const [nominalRealisasi, setNominalRealisasi] = useState<string>("");
  const [tanggalLaporan, setTanggalLaporan] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [noSpkOrKwitansi, setNoSpkOrKwitansi] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    if (submission) {
      setNominalRealisasi(
        submission.nominalRealisasi > 0
          ? submission.nominalRealisasi.toString()
          : submission.nominalPengajuan.toString()
      );
      setTanggalLaporan(
        submission.tanggalLaporan || new Date().toISOString().split("T")[0]
      );
      setNoSpkOrKwitansi(submission.noSpkOrKwitansi || "");
      setCatatan(submission.catatan || "");
      setPurchaseItems(submission.purchaseItems || []);
    }
  }, [submission, isOpen]);

  if (!isOpen || !submission || !item) return null;

  const monthObj = LAZUARDI_MONTHS.find((m) => m.num === submission.monthNum);
  const numPengajuan = submission.nominalPengajuan || 0;
  const numRealisasi = parseFloat(nominalRealisasi) || 0;

  // Calculate sum of purchase items list
  const totalFromItemsList = purchaseItems.reduce(
    (sum, p) => sum + (p.totalPrice || p.qty * p.unitPrice || 0),
    0
  );

  const addPurchaseRow = () => {
    const newItem: PurchaseItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      qty: 1,
      unit: "Pcs",
      unitPrice: 0,
      totalPrice: 0
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  const removePurchaseRow = (id: string) => {
    setPurchaseItems(purchaseItems.filter((p) => p.id !== id));
  };

  const updatePurchaseRow = (
    id: string,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    setPurchaseItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === "qty" || field === "unitPrice") {
          const q = typeof updated.qty === "number" ? updated.qty : parseFloat(updated.qty as string) || 0;
          const u = typeof updated.unitPrice === "number" ? updated.unitPrice : parseFloat(updated.unitPrice as string) || 0;
          updated.totalPrice = q * u;
        }
        return updated;
      })
    );
  };

  const copySubtotalToRealisasi = () => {
    if (totalFromItemsList > 0) {
      setNominalRealisasi(totalFromItemsList.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalSub: ApbsSubmission = {
      ...submission,
      nominalRealisasi: numRealisasi,
      tanggalLaporan,
      isReported: true, // LPJ status completed!
      noSpkOrKwitansi,
      catatan,
      purchaseItems
    };

    onSaveReport(finalSub);
    onClose();
  };

  const selisih = numPengajuan - numRealisasi;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header: Navy & Gold */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Form Laporan Pertanggungjawaban (LPJ) / Realisasi
              </h3>
              <p className="text-xs text-amber-200/90 font-medium">
                Kode APBS: <span className="font-mono font-bold text-amber-300">{item.rek || "Tanpa Rekening"}</span> | {item.name}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* Submission Info Bar */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-500 block text-[11px]">Bulan Periode APBS:</span>
              <strong className="text-slate-900 text-xs">{monthObj?.name} (Bulan ke-{monthObj?.order})</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Nominal Pengajuan Proposal:</span>
              <strong className="text-blue-900 font-extrabold text-sm">{formatRupiah(numPengajuan)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Tanggal Pengajuan:</span>
              <strong className="text-slate-800 text-xs">{submission.tanggalPengajuan || "-"}</strong>
            </div>
          </div>

          {/* Section: Rincian Pembelian Apa Saja */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-1.5 text-amber-600" />
                  Rincian Pembelian / Item Belanja Realisasi:
                </h4>
                <p className="text-[11px] text-slate-500">
                  Masukkan rincian barang/jasa yang dibeli beserta kuantitas & harganya.
                </p>
              </div>

              <button
                type="button"
                onClick={addPurchaseRow}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item Belanja</span>
              </button>
            </div>

            {purchaseItems.length === 0 ? (
              <div className="p-4 bg-amber-50/50 border border-dashed border-amber-300 rounded-xl text-center text-slate-600">
                <p className="font-semibold text-xs text-amber-900">Belum ada rincian barang/jasa.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik tombol <strong>"Tambah Item Belanja"</strong> di atas untuk menambahkan rincian nota/kwitansi.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0F2C59] text-white font-bold text-[11px]">
                        <th className="py-2 px-3 w-8 text-center">#</th>
                        <th className="py-2 px-3">Nama / Rincian Barang</th>
                        <th className="py-2 px-3 w-20 text-center">Qty</th>
                        <th className="py-2 px-3 w-24 text-center">Satuan</th>
                        <th className="py-2 px-3 w-32 text-right">Harga Satuan (Rp)</th>
                        <th className="py-2 px-3 w-32 text-right">Total Subtotal (Rp)</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {purchaseItems.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => updatePurchaseRow(p.id, "name", e.target.value)}
                              placeholder="Contoh: Kertas A4 80gr"
                              className="w-full py-1 px-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min={1}
                              value={p.qty}
                              onChange={(e) => updatePurchaseRow(p.id, "qty", parseFloat(e.target.value) || 0)}
                              className="w-full py-1 px-1 text-center border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs font-bold"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="text"
                              value={p.unit}
                              onChange={(e) => updatePurchaseRow(p.id, "unit", e.target.value)}
                              placeholder="Rim/Pcs"
                              className="w-full py-1 px-1 text-center border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min={0}
                              value={p.unitPrice}
                              onChange={(e) => updatePurchaseRow(p.id, "unitPrice", parseFloat(e.target.value) || 0)}
                              placeholder="50000"
                              className="w-full py-1 px-2 text-right border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs font-mono"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold font-mono text-slate-900">
                            {formatRupiah(p.totalPrice || p.qty * p.unitPrice)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removePurchaseRow(p.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="Hapus Baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-50/80 font-bold border-t border-amber-200">
                        <td colSpan={5} className="py-2 px-3 text-right text-slate-800">
                          Total Rincian Pembelian:
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-amber-900 font-mono text-xs">
                          {formatRupiah(totalFromItemsList)}
                        </td>
                        <td className="py-2 px-1">
                          {totalFromItemsList > 0 && (
                            <button
                              type="button"
                              onClick={copySubtotalToRealisasi}
                              className="p-1 text-[10px] bg-blue-900 text-white rounded hover:bg-blue-800 font-semibold"
                              title="Gunakan Total Rincian sebagai Nominal Realisasi"
                            >
                              Gunakan
                            </button>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Nominal Realisasi & Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800">
                  Total Nominal Realisasi LPJ (Rp):
                </label>
                {totalFromItemsList > 0 && (
                  <button
                    type="button"
                    onClick={copySubtotalToRealisasi}
                    className="text-[10px] text-blue-700 hover:underline font-semibold flex items-center"
                  >
                    <Calculator className="w-3 h-3 mr-0.5" /> Ambil dari Total Rincian
                  </button>
                )}
              </div>
              <input
                type="number"
                value={nominalRealisasi}
                onChange={(e) => setNominalRealisasi(e.target.value)}
                placeholder="Total Aktual Terpakai"
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs font-bold text-slate-900 bg-white"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Total kas aktual yang benar-benar dibayarkan
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Tanggal Dokumen Laporan / LPJ:
              </label>
              <input
                type="date"
                value={tanggalLaporan}
                onChange={(e) => setTanggalLaporan(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs bg-white"
                required
              />
            </div>
          </div>

          {/* Selisih Calculation Preview */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Pengajuan Proposal:</span>
              <span className="font-bold text-blue-900">{formatRupiah(numPengajuan)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Realisasi LPJ:</span>
              <span className="font-bold text-slate-900">{formatRupiah(numRealisasi)}</span>
            </div>
            <div className="flex justify-between font-extrabold border-t border-slate-200 pt-1 text-slate-900">
              <span>Selisih (Pengajuan vs Realisasi):</span>
              <span className={selisih > 0 ? "text-emerald-700" : selisih < 0 ? "text-rose-600" : "text-slate-800"}>
                {selisih > 0
                  ? `Sisa Dikembalikan: ${formatRupiah(selisih)}`
                  : selisih < 0
                  ? `Over Realisasi: ${formatRupiah(-selisih)}`
                  : "Pas (Tidak Ada Selisih)"}
              </span>
            </div>
          </div>

          {/* SPK & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                No. SPK / Kwitansi / Bukti Pembayaran:
              </label>
              <input
                type="text"
                value={noSpkOrKwitansi}
                onChange={(e) => setNoSpkOrKwitansi(e.target.value)}
                placeholder="Contoh: KW-2026-001"
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Catatan / Keterangan LPJ:
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan pengerjaan / kendala belanja..."
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white rounded-xl font-bold transition-all shadow text-xs flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Laporan LPJ</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
