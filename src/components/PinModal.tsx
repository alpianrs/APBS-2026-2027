import React, { useState } from "react";
import { Lock, X, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Otorisasi Akses PIN Pengurus",
  description = "Masukkan PIN keamanan untuk menghapus atau membatalkan data pengajuan APBS."
}) => {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.trim() !== "123") {
      setError("PIN Salah! Masukkan PIN yang benar (Default: 123).");
      return;
    }

    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setPin("");
      setError("");
      onSuccess();
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] px-5 py-4 text-white border-b-2 border-amber-400 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">{title}</h3>
              <p className="text-[11px] text-blue-200">PIN Otorisasi Penghapusan (PIN: 123)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              {description} Data akan dihapus secara permanen dari <strong>aplikasi</strong> dan <strong>Google Spreadsheet</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Masukkan PIN Keamanan (3 Digit):
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              placeholder="Contoh: 123"
              className="w-full px-3 py-2 text-center text-lg font-mono font-extrabold tracking-widest rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-[#0F2C59] focus:outline-none"
              autoFocus
            />
            {error && (
              <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {error}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDeleting || !pin}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold flex items-center shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>{isDeleting ? "Menghapus..." : "Konfirmasi Hapus"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
