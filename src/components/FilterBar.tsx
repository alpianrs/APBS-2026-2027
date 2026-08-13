import React from "react";
import { Search, Filter, X, Calendar, Building2, ArrowDownCircle } from "lucide-react";
import { LAZUARDI_MONTHS } from "../lib/constants";
import { ApbsStatusType } from "../types";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMonth: number | "ALL";
  onMonthChange: (month: number | "ALL") => void;
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
  selectedStatus: ApbsStatusType | "ALL";
  onStatusChange: (status: ApbsStatusType | "ALL") => void;
  units: string[];
  totalResults: number;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedMonth,
  onMonthChange,
  selectedUnit,
  onUnitChange,
  selectedStatus,
  onStatusChange,
  units,
  totalResults,
  onResetFilters
}) => {
  const isFiltered =
    searchQuery !== "" ||
    selectedMonth !== "ALL" ||
    selectedUnit !== "ALL" ||
    selectedStatus !== "ALL";

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6 space-y-3">
      
      {/* Top Search & Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        
        {/* Search Input (Kolom G Deskripsi Item) */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari item di Kolom G (Contoh: Sampah, Listrik, Buku, Obeng)..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Month Dropdown Selector */}
        <div className="lg:col-span-2 flex items-center space-x-1.5">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) =>
              onMonthChange(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">📅 Semua Bulan (Juli - Juni)</option>
            {LAZUARDI_MONTHS.map((m) => (
              <option key={m.num} value={m.num}>
                Bulan {m.name} (Bulan ke-{m.order})
              </option>
            ))}
          </select>
        </div>

        {/* Unit Dropdown Selector */}
        <div className="lg:col-span-3 flex items-center space-x-1.5">
          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">🏢 Semua Unit Sekolah</option>
            {units.map((u) => (
              <option key={u} value={u}>
                Unit: {u}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown Selector */}
        <div className="lg:col-span-3 flex items-center space-x-1.5">
          <Filter className="w-4 h-4 text-[#0F2C59] flex-shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as ApbsStatusType | "ALL")}
            className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-bold text-slate-800 cursor-pointer"
          >
            <option value="ALL">⚡ Semua Status APBS</option>
            <option value="BELUM_LAPORAN">📋 Belum Laporan (LPJ)</option>
            <option value="SUDAH_DILAPORKAN">✅ Sudah Dilaporkan (Selesai)</option>
            <option value="TERLAT_APBS">🚨 Telat APBS (Keterlambatan)</option>
            <option value="HARUS_DIAJUKAN_BULAN_INI">⏰ Target Bulan Ini</option>
            <option value="DI_LUAR_APBS">⚠️ Di Luar APBS (Over Budget)</option>
            <option value="SISA_DANA_DIKEMBALIKAN">💵 Sisa Dana Pengajuan</option>
            <option value="BELUM_DIAJUKAN">⏳ Belum Diajukan</option>
          </select>
        </div>

      </div>

      {/* Bottom Summary & Filter Reset Bar */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <span className="font-medium">
            Menampilkan <strong className="text-slate-900 font-bold">{totalResults}</strong> item APBS
          </span>
          {isFiltered && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold text-[11px]">
              Filter Aktif
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
              title="Reset Semua Filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}

          <button
            onClick={() => {
              document.getElementById("total-apbs-footer")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-3 py-1 bg-[#0F2C59] text-amber-300 hover:bg-blue-900 rounded-lg text-xs font-extrabold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
            title="Langsung ke Seluruh Total APBS di bagian bawah"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Seluruh Total APBS ⬇️</span>
          </button>
        </div>
      </div>

    </div>
  );
};
