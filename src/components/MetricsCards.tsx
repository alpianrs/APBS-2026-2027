import React from "react";
import {
  Wallet,
  CheckCircle2,
  PieChart,
  AlertTriangle,
  Clock,
  TrendingDown,
  FileText
} from "lucide-react";
import { ApbsSummaryData } from "../types";
import { formatRupiah } from "../lib/constants";

interface MetricsCardsProps {
  summary: ApbsSummaryData;
  activeMonthName: string;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  summary,
  activeMonthName
}) => {
  const percentageRealized =
    summary.totalApbs > 0
      ? Math.min(100, (summary.totalRealisasi / summary.totalApbs) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      
      {/* Total Plafond APBS */}
      <div className="bg-gradient-to-br from-[#0F2C59] to-[#1E3A8A] text-white rounded-xl p-4 border border-blue-900 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Total Plafond APBS
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {formatRupiah(summary.totalApbs)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-blue-200/90 mt-2 flex items-center">
          <span className="font-semibold text-amber-300 mr-1">Tahun Ajaran</span>
          Juli - Juni Lazuardi
        </p>
      </div>

      {/* Total Pengajuan vs Realisasi */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Realisasi Penggunaan (LPJ)
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F2C59] mt-1">
              {formatRupiah(summary.totalRealisasi)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>Diajukan: <strong className="text-slate-800">{formatRupiah(summary.totalPengajuan)}</strong></span>
          <span className="font-bold text-blue-800">{percentageRealized.toFixed(1)}% APBS</span>
        </div>
      </div>

      {/* Sisa APBS Lazuardi */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sisa Plafond APBS
            </p>
            <h3
              className={`text-xl sm:text-2xl font-extrabold mt-1 ${
                summary.sisaApbs < 0 ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {formatRupiah(summary.sisaApbs)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
            <PieChart className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 flex items-center">
          {summary.sisaApbs < 0 ? (
            <span className="text-rose-600 font-bold flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1" /> Over Target APBS
            </span>
          ) : (
            <span className="text-emerald-700 font-bold">Plafond Sisa Aman</span>
          )}
        </p>
      </div>

      {/* LPJ Pending / Belum Laporan */}
      <div className="bg-amber-500 text-slate-950 rounded-xl p-4 border border-amber-400 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
              Belum Laporan (LPJ)
            </p>
            <h3 className="text-2xl sm:text-3xl font-black mt-0.5 text-slate-950">
              {summary.pendingReportCount} <span className="text-xs font-bold text-slate-900">Item</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-950/10 border border-slate-950/20 flex items-center justify-center text-slate-950">
            <FileText className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-900 mt-2 truncate">
          Sudah diajukan, menunggu laporan realisasi belanja
        </p>
      </div>

      {/* Overdue / Due Alert Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kepatuhan APBS
            </p>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-lg font-bold text-rose-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {summary.overdueCount} <span className="text-[10px] font-normal text-slate-600 ml-0.5">Telat</span>
              </span>
              <span className="text-lg font-bold text-purple-700 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {summary.overBudgetCount} <span className="text-[10px] font-normal text-slate-600 ml-0.5">Over</span>
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 truncate">
          Bulan {activeMonthName}: <strong className="text-slate-800">{summary.dueThisMonthCount} item</strong> target
        </p>
      </div>

    </div>
  );
};

