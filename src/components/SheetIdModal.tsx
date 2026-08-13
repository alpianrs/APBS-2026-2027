import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Link,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Globe,
  Share2,
  Info
} from "lucide-react";

interface SheetIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSheetId: string;
  onSaveSheetId: (newSheetId: string) => void;
  defaultSheetId: string;
}

export const SheetIdModal: React.FC<SheetIdModalProps> = ({
  isOpen,
  onClose,
  currentSheetId,
  onSaveSheetId,
  defaultSheetId
}) => {
  const [inputVal, setInputVal] = useState(currentSheetId);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSaveSheetId(inputVal.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    setInputVal(defaultSheetId);
    onSaveSheetId(defaultSheetId);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2C59] to-[#1E3A8A] text-white p-5 flex items-center justify-between border-b border-amber-400/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-md font-bold">
              <FileSpreadsheet className="w-5 h-5 text-[#0F2C59]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pengaturan Google Spreadsheet APBS</h2>
              <p className="text-xs text-blue-200">Ganti ID / Link Spreadsheet Sumber Data Live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ID Spreadsheet berhasil diperbarui! Memuat ulang data...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Link atau ID Google Spreadsheet:
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Tempelkan link Google Sheet atau ID di sini..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0F2C59] focus:border-transparent outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Anda dapat memasukkan ID saja atau menempelkan seluruh link Google Sheet dari browser.
            </p>
          </div>

          {/* Guidelines Box */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs space-y-2 text-amber-950">
            <div className="font-bold flex items-center space-x-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Panduan Jika Spreadsheet Berada di Shared Drive / Grup Tim:</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-slate-700 leading-relaxed">
              <li>
                <strong>Opsi 1 (Disarankan jika dibatasi):</strong> Buka file Google Sheet &rarr; Menu <strong>File</strong> &rarr; <strong>Publikasikan ke web</strong> (<em>Publish to web</em>) &rarr; Pilih format <strong>Nilai yang dipisahkan koma (.csv)</strong> &rarr; Klik <strong>Publikasikan</strong>.
              </li>
              <li>
                <strong>Opsi 2:</strong> Klik tombol <strong>Bagikan (Share)</strong> di Google Sheet &rarr; Ubah Akses Umum menjadi <strong>Siapa saja yang memiliki link (Anyone with link)</strong> sebagai <em>Viewer</em>.
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gunakan Default APBS Lazuardi</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0F2C59] to-[#1E3A8A] hover:opacity-90 rounded-xl shadow-md transition-all"
              >
                Simpan & Hubungkan
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
