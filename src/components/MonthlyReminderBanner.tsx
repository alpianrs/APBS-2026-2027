import React, { useState } from "react";
import { AlertCircle, Clock, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { ApbsRecapItem } from "../types";
import { formatRupiah } from "../lib/constants";

interface MonthlyReminderBannerProps {
  overdueItems: ApbsRecapItem[];
  dueThisMonthItems: ApbsRecapItem[];
  currentMonthName: string;
  onOpenSubmissionForItem: (item: ApbsRecapItem) => void;
}

export const MonthlyReminderBanner: React.FC<MonthlyReminderBannerProps> = ({
  overdueItems,
  dueThisMonthItems,
  currentMonthName,
  onOpenSubmissionForItem
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (overdueItems.length === 0 && dueThisMonthItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Toggle Button for Peringatan & Target APBS */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 hover:from-amber-100 hover:to-rose-100 border border-amber-300/80 rounded-xl transition-all shadow-2xs group cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-800" />
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-slate-900">
                Peringatan & Target APBS
              </span>
              {overdueItems.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-2xs">
                  🚨 {overdueItems.length} Telat APBS
                </span>
              )}
              {dueThisMonthItems.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-2xs">
                  ⏰ {dueThisMonthItems.length} Target {currentMonthName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Klik tombol ini untuk {isOpen ? "menyembunyikan" : "menampilkan"} rincian item telat & target pengajuan.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 pl-2">
          <span className="text-xs font-bold text-amber-900 group-hover:underline hidden sm:inline">
            {isOpen ? "Sembunyikan" : "Tampilkan Rincian"}
          </span>
          <div className="w-6 h-6 rounded-full bg-white/80 border border-amber-300 flex items-center justify-center text-amber-900">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Content View */}
      {isOpen && (
        <div className="space-y-3 pt-1 animate-fadeIn">
          {/* Overdue APBS Alert (Telat APBS) */}
          {overdueItems.length > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-rose-950">
                        Peringatan Keterlambatan Pengajuan (TELAT APBS)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                        {overdueItems.length} Item
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Terdapat anggaran APBS dengan target bulan lalu yang belum dibuat pengajuannya. Segera proses pengajuan berikut:
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {overdueItems.map((r) => (
                        <button
                          key={r.item.id}
                          onClick={() => onOpenSubmissionForItem(r)}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-xs text-rose-900 hover:bg-rose-100 font-medium transition-colors shadow-xs"
                        >
                          <span className="truncate max-w-[200px] font-semibold">{r.item.name}</span>
                          <span className="ml-1.5 text-rose-600 font-bold">
                            ({formatRupiah(r.targetApbsTotal)})
                          </span>
                          <ArrowRight className="w-3 h-3 ml-1 text-rose-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Due This Month Reminder */}
          {dueThisMonthItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-amber-950">
                      Target Pengajuan APBS Bulan Ini ({currentMonthName})
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-amber-950">
                      {dueThisMonthItems.length} Item Belum Diajukan
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Item-item berikut memiliki alokasi anggaran APBS di bulan {currentMonthName} dan siap untuk dibuatkan dokumen pengajuan:
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {dueThisMonthItems.map((r) => (
                      <button
                        key={r.item.id}
                        onClick={() => onOpenSubmissionForItem(r)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs text-amber-900 hover:bg-amber-100 font-medium transition-colors shadow-xs"
                      >
                        <span className="truncate max-w-[200px] font-semibold">{r.item.name}</span>
                        <span className="ml-1.5 text-amber-700 font-bold">
                          ({formatRupiah(r.targetApbsFilteredMonth || r.targetApbsTotal)})
                        </span>
                        <ArrowRight className="w-3 h-3 ml-1 text-amber-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
