import React, { useState, useEffect } from "react";
import { X, Save, AlertTriangle, FileText, Plus, Trash2, ShoppingBag } from "lucide-react";
import { ApbsItem, ApbsSubmission, ApbsRecapItem, PurchaseItem } from "../types";
import { LAZUARDI_MONTHS, formatRupiah } from "../lib/constants";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ApbsItem[];
  preselectedRecapItem?: ApbsRecapItem | null;
  editSubmission?: ApbsSubmission | null;
  submissions?: ApbsSubmission[];
  onSave: (submission: Omit<ApbsSubmission, "id"> & { id?: string }) => void;
  defaultMonthNum: number;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  items,
  preselectedRecapItem,
  editSubmission,
  submissions = [],
  onSave,
  defaultMonthNum
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [monthNum, setMonthNum] = useState<number>(defaultMonthNum);
  const [nominalPengajuan, setNominalPengajuan] = useState<string>("");
  const [nominalRealisasi, setNominalRealisasi] = useState<string>("");
  const [tanggalPengajuan, setTanggalPengajuan] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [noSpkOrKwitansi, setNoSpkOrKwitansi] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [submittedBy, setSubmittedBy] = useState<string>("Tim Keuangan Lazuardi");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [isAlreadyReported, setIsAlreadyReported] = useState<boolean>(false);

  useEffect(() => {
    if (editSubmission) {
      setSelectedItemId(editSubmission.itemId);
      setMonthNum(editSubmission.monthNum);
      setNominalPengajuan(editSubmission.nominalPengajuan.toString());
      setNominalRealisasi(editSubmission.nominalRealisasi.toString());
      setTanggalPengajuan(editSubmission.tanggalPengajuan);
      setNoSpkOrKwitansi(editSubmission.noSpkOrKwitansi || "");
      setCatatan(editSubmission.catatan || "");
      setSubmittedBy(editSubmission.submittedBy || "Tim Keuangan Lazuardi");
      setPurchaseItems(editSubmission.purchaseItems || []);
      setIsAlreadyReported(Boolean(editSubmission.isReported || editSubmission.nominalRealisasi > 0));
    } else if (preselectedRecapItem) {
      setSelectedItemId(preselectedRecapItem.item.id);
      setMonthNum(defaultMonthNum);
      const targetM = preselectedRecapItem.item.monthlyBudgets[defaultMonthNum] || preselectedRecapItem.item.totalApbs;
      setNominalPengajuan(targetM > 0 ? targetM.toString() : "");
      setNominalRealisasi("0");
      setNoSpkOrKwitansi("");
      setCatatan("");
      setPurchaseItems([]);
      setIsAlreadyReported(false);
    } else {
      setSelectedItemId(items[0]?.id || "");
      setMonthNum(defaultMonthNum);
      setNominalPengajuan("");
      setNominalRealisasi("0");
      setNoSpkOrKwitansi("");
      setCatatan("");
      setPurchaseItems([]);
      setIsAlreadyReported(false);
    }
  }, [editSubmission, preselectedRecapItem, isOpen, defaultMonthNum, items]);

  if (!isOpen) return null;

  const currentSelectedItem = items.find((it) => it.id === selectedItemId);
  const numPengajuan = parseFloat(nominalPengajuan) || 0;
  const numRealisasi = parseFloat(nominalRealisasi) || 0;

  const targetApbsTotal = currentSelectedItem?.totalApbs || 0;
  const targetApbsMonth = currentSelectedItem?.monthlyBudgets[monthNum] || 0;

  const totalFromPurchaseItems = purchaseItems.reduce(
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

  const syncPengajuanWithPurchaseItems = () => {
    if (totalFromPurchaseItems > 0) {
      setNominalPengajuan(totalFromPurchaseItems.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    onSave({
      id: editSubmission?.id,
      itemId: selectedItemId,
      monthNum,
      nominalPengajuan: numPengajuan,
      nominalRealisasi: numRealisasi,
      tanggalPengajuan,
      isReported: isAlreadyReported || numRealisasi > 0,
      noSpkOrKwitansi,
      catatan,
      submittedBy,
      purchaseItems
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Navy & Gold Accent */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {editSubmission ? "Edit Form Pengajuan APBS" : "Form Input Pengajuan APBS Baru"}
              </h3>
              <p className="text-xs text-amber-200/90 font-medium">
                {currentSelectedItem?.rek ? `Kode APBS: ${currentSelectedItem.rek}` : "Lazuardi APBS Control Engine"}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Informational Banner if selected item has pending unreported submissions */}
          {!editSubmission && selectedItemId && (() => {
            const itemExistingSubs = submissions.filter((s) => s.itemId === selectedItemId);
            const itemUnreportedSubs = itemExistingSubs.filter((s) => s.nominalPengajuan > 0 && (!s.isReported || s.nominalRealisasi === 0));
            if (itemUnreportedSubs.length === 0) return null;

            return (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start space-x-2.5 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-amber-950">
                    ℹ️ Kode APBS ini memiliki {itemUnreportedSubs.length} pengajuan sebelumnya yang belum dilaporkan (LPJ)
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Pengajuan baru yang Anda buat sekarang akan dicatat sebagai dokumen pengajuan tambahan. Anda dapat membuat beberapa pengajuan dan melaporkan LPJ masing-masing secara terpisah.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Item Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Pilih Item APBS (Kolom G Deskripsi):
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs font-semibold text-slate-800"
              required
            >
              <option value="">-- Pilih Item APBS --</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.rek ? `[Kode ${it.rek}] ` : ""}[{it.unit}] {it.name} (Plafond APBS: {formatRupiah(it.totalApbs)})
                </option>
              ))}
            </select>
          </div>

          {/* Month & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bulan Periode Pengajuan:
              </label>
              <select
                value={monthNum}
                onChange={(e) => setMonthNum(Number(e.target.value))}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs font-bold text-[#0F2C59]"
              >
                {LAZUARDI_MONTHS.map((m) => (
                  <option key={m.num} value={m.num}>
                    Bulan {m.name} (Bulan ke-{m.order})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tanggal Dokumen Pengajuan:
              </label>
              <input
                type="date"
                value={tanggalPengajuan}
                onChange={(e) => setTanggalPengajuan(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                required
              />
            </div>
          </div>

          {/* Rincian Item Belanja / Pembelian */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 flex items-center text-xs">
                  <ShoppingBag className="w-4 h-4 mr-1 text-amber-600" />
                  Rincian Barang / Pembelian Yang Diajukan:
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Opsional: Tambahkan daftar item yang akan dibeli agar tercatat secara detail.
                </span>
              </div>
              <button
                type="button"
                onClick={addPurchaseRow}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>
            </div>

            {purchaseItems.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0F2C59] text-white text-[10px] font-bold">
                      <th className="p-2">Nama Barang / Jasa</th>
                      <th className="p-2 text-center w-16">Qty</th>
                      <th className="p-2 text-center w-20">Satuan</th>
                      <th className="p-2 text-right w-28">Harga (Rp)</th>
                      <th className="p-2 text-right w-28">Subtotal</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {purchaseItems.map((p) => (
                      <tr key={p.id}>
                        <td className="p-1">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => updatePurchaseRow(p.id, "name", e.target.value)}
                            placeholder="Deskripsi barang"
                            className="w-full p-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={p.qty}
                            onChange={(e) => updatePurchaseRow(p.id, "qty", parseFloat(e.target.value) || 0)}
                            className="w-full p-1 text-center border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={p.unit}
                            onChange={(e) => updatePurchaseRow(p.id, "unit", e.target.value)}
                            placeholder="Pcs"
                            className="w-full p-1 text-center border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={p.unitPrice}
                            onChange={(e) => updatePurchaseRow(p.id, "unitPrice", parseFloat(e.target.value) || 0)}
                            placeholder="Harga"
                            className="w-full p-1 text-right border border-slate-200 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-2 text-right font-bold font-mono text-slate-800">
                          {formatRupiah(p.totalPrice || p.qty * p.unitPrice)}
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removePurchaseRow(p.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 font-bold text-slate-900 border-t border-amber-200">
                      <td colSpan={4} className="p-1.5 text-right">
                        Total Item Rincian:
                      </td>
                      <td className="p-1.5 text-right font-mono text-amber-900">
                        {formatRupiah(totalFromPurchaseItems)}
                      </td>
                      <td className="p-1">
                        <button
                          type="button"
                          onClick={syncPengajuanWithPurchaseItems}
                          className="text-[9px] bg-blue-900 text-white px-1.5 py-0.5 rounded font-bold"
                          title="Sampaikan ke Nominal Pengajuan"
                        >
                          Pakai
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Nominal Pengajuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Nominal Diajukan (Proposal) (Rp):
              </label>
              <input
                type="number"
                value={nominalPengajuan}
                onChange={(e) => setNominalPengajuan(e.target.value)}
                placeholder="Contoh: 1000000"
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs font-bold text-blue-900 bg-white"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Target Plafond Bulan {LAZUARDI_MONTHS.find((m) => m.num === monthNum)?.name}:{" "}
                <strong className="text-slate-800">{formatRupiah(targetApbsMonth)}</strong>
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Petugas / Unit Pengaju:
              </label>
              <input
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="Nama Petugas / Unit"
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs bg-white"
                required
              />
            </div>
          </div>

          {/* Optional Direct LPJ Fill or Later Status Note */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-slate-800 space-y-1">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 block">Status Laporan LPJ:</span>
                <p className="text-[11px] text-slate-600">
                  Setelah pengajuan dibuat, item ini akan ditandai dengan status <strong className="text-amber-800">"Belum Laporan (LPJ Pending)"</strong> hingga Anda mengisikan Laporan Realisasi / LPJ belanja.
                </p>
              </div>
            </div>
          </div>

          {/* Document & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                No. SPK / Kwitansi / Dokumen:
              </label>
              <input
                type="text"
                value={noSpkOrKwitansi}
                onChange={(e) => setNoSpkOrKwitansi(e.target.value)}
                placeholder="Contoh: SPK-2026-089"
                className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Catatan Pengajuan:
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Keterangan keperluan pengajuan..."
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
              className="px-5 py-2 bg-gradient-to-r from-[#0F2C59] to-[#1E3A8A] text-white hover:from-[#1E3A8A] hover:to-[#1E40AF] rounded-xl font-bold transition-all shadow text-xs flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>Simpan Pengajuan APBS</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
