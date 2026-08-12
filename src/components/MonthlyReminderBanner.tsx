import React from "react";
import { AlertCircle, Clock, ArrowRight, CheckCircle } from "lucide-react";
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
  if (overdueItems.length === 0 && dueThisMonthItems.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              Semua Pengajuan APBS Tepat Waktu
            </h4>
            <p className="text-xs text-emerald-700">
              Tidak ada pengajuan APBS yang terlewat atau tertunda untuk bulan {currentMonthName}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {overdueItems.slice(0, 4).map((r) => (
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
                  {overdueItems.length > 4 && (
                    <span className="text-xs font-semibold text-rose-700 self-center">
                      +{overdueItems.length - 4} item lainnya...
                    </span>
                  )}
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
              <div className="mt-2 flex flex-wrap gap-2">
                {dueThisMonthItems.slice(0, 4).map((r) => (
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
  );
};
