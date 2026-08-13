import React from "react";
import {
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  BarChart3,
  Printer,
  Calendar,
  FileCode,
  Building2,
  ShieldCheck
} from "lucide-react";
import { LAZUARDI_MONTHS } from "../lib/constants";

interface HeaderProps {
  sheetId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSheetIdModal: () => void;
  onOpenNewSubmission: () => void;
  onToggleCharts: () => void;
  showCharts: boolean;
  onOpenPrintReport: () => void;
  onOpenAppsScript: () => void;
  activeMonthNum: number;
  onChangeActiveMonth: (monthNum: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheetId,
  isRefreshing,
  onRefresh,
  onOpenSheetIdModal,
  onOpenNewSubmission,
  onToggleCharts,
  showCharts,
  onOpenPrintReport,
  onOpenAppsScript,
  activeMonthNum,
  onChangeActiveMonth
}) => {
  return (
    <header className="bg-gradient-to-r from-[#0B1E3F] via-[#0F2C59] to-[#1E3A8A] text-white border-b-2 border-amber-400 shadow-xl relative overflow-hidden">
      
      {/* Decorative subtle background elements */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Brand & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group shrink-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-2 border-amber-200 flex flex-col items-center justify-center shadow-lg font-black tracking-tighter leading-none group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6 text-[#0F2C59]" />
                <span className="text-[9px] font-extrabold text-[#0F2C59] uppercase tracking-wider mt-0.5">LZ FM</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0F2C59] rounded-full shadow-xs" title="Sistem Aktif Terkoneksi"></div>
            </div>

            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white drop-shadow-xs">
                  Monitoring APBS <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">Facility Management</span>
                </h1>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950 border border-amber-300 shadow-xs">
                  <ShieldCheck className="w-3 h-3 text-slate-950" />
                  <span>Facility & Ops Control</span>
                </span>
              </div>

              <p className="text-xs text-blue-200/90 mt-1 flex items-center space-x-2 flex-wrap">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                <span>Google Sheet Live Sync</span>
                <span className="text-amber-400">•</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-300 font-semibold underline hover:text-amber-200 truncate max-w-[150px] sm:max-w-xs"
                  title="Buka Sheet di Google Sheets"
                >
                  ID: {sheetId.slice(0, 10)}...
                </a>
                <button
                  onClick={onOpenSheetIdModal}
                  className="px-2 py-0.5 rounded bg-blue-900/80 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-amber-400/40 text-[10px] font-bold transition-all cursor-pointer"
                  title="Ganti Link / ID Spreadsheet"
                >
                  Ganti Link / ID
                </button>
              </p>
            </div>
          </div>

          {/* Active Month Selector & Main Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            
            {/* School Active Month Indicator Selector */}
            <div className="flex items-center bg-[#06152D]/90 border border-amber-400/40 rounded-xl px-2.5 py-1.5 text-xs text-blue-100 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-300 mr-1.5" />
              <span className="text-blue-200 mr-1 hidden sm:inline font-medium">Bulan Berjalan:</span>
              <select
                value={activeMonthNum}
                onChange={(e) => onChangeActiveMonth(Number(e.target.value))}
                className="bg-[#0F2C59] border border-amber-400/50 text-amber-300 font-bold rounded-lg px-2 py-0.5 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
              >
                {LAZUARDI_MONTHS.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name} (Bulan ke-{m.order})
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Sheet Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-1.5 border border-blue-400/30 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50 cursor-pointer"
              title="Muat Ulang Data dari Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-amber-300 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync Sheet"}</span>
            </button>

            {/* Charts Toggle */}
            <button
              onClick={onToggleCharts}
              className={`inline-flex items-center px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showCharts
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                  : "bg-white/10 text-white border-blue-400/30 hover:bg-white/20"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              <span>{showCharts ? "Sembunyikan Grafik" : "Grafik"}</span>
            </button>

            {/* Google Apps Script Button */}
            <button
              onClick={onOpenAppsScript}
              className="inline-flex items-center px-3 py-1.5 border border-emerald-400/50 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all shadow-xs cursor-pointer"
              title="Lihat & Salin Google Apps Script untuk Otomatisasi Sheets"
            >
              <FileCode className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
              <span>Apps Script</span>
            </button>

            {/* Printable Report */}
            <button
              onClick={onOpenPrintReport}
              className="inline-flex items-center px-3 py-1.5 border border-blue-400/30 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-200" />
              <span>Cetak Rekap</span>
            </button>

            {/* Log New Submission */}
            <button
              onClick={onOpenNewSubmission}
              className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all active:scale-95 border border-amber-300 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-1.5 text-slate-950" />
              <span>+ Buat Pengajuan</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

