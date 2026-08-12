import React from "react";
import { Search, Filter, X, Calendar, Building2 } from "lucide-react";
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
      
      {/* Top Search & Dropdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* Search Input (Kolom G Deskripsi Item) */}
        <div className="md:col-span-5 relative">
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

        {/* Month Selector */}
        <div className="md:col-span-3 flex items-center space-x-1.5">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) =>
              onMonthChange(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-700"
          >
            <option value="ALL">📅 Semua Bulan (Juli - Juni)</option>
            {LAZUARDI_MONTHS.map((m) => (
              <option key={m.num} value={m.num}>
                Bulan {m.name} (Bulan ke-{m.order})
              </option>
            ))}
          </select>
        </div>

        {/* Unit Selector */}
        <div className="md:col-span-3 flex items-center space-x-1.5">
          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-700"
          >
            <option value="ALL">🏢 Semua Unit Sekolah</option>
            {units.map((u) => (
              <option key={u} value={u}>
                Unit: {u}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <div className="md:col-span-1 flex items-center justify-end">
            <button
              onClick={onResetFilters}
              className="p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center"
              title="Reset Semua Filter"
            >
              <X className="w-4 h-4 mr-1" /> Reset
            </button>
          </div>
        )}

      </div>

      {/* Quick Filter Status Pills */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold mr-1 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" /> Filter Status:
          </span>

          <button
            onClick={() => onStatusChange("ALL")}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              selectedStatus === "ALL"
                ? "bg-[#0F2C59] text-white border-[#0F2C59]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Semua
          </button>

          <button
            onClick={() => onStatusChange("BELUM_LAPORAN")}
            className={`px-3 py-1 rounded-full border text-xs font-extrabold transition-colors flex items-center space-x-1 ${
              selectedStatus === "BELUM_LAPORAN"
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
            }`}
          >
            <span>📋 Belum Laporan (LPJ)</span>
          </button>

          <button
            onClick={() => onStatusChange("SUDAH_DILAPORKAN")}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-colors ${
              selectedStatus === "SUDAH_DILAPORKAN"
                ? "bg-blue-800 text-white border-blue-800"
                : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
            }`}
          >
            ✅ Sudah Dilaporkan
          </button>

          <button
            onClick={() => onStatusChange("TERLAT_APBS")}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-colors ${
              selectedStatus === "TERLAT_APBS"
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            }`}
          >
            🚨 Telat APBS
          </button>

          <button
            onClick={() => onStatusChange("HARUS_DIAJUKAN_BULAN_INI")}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-colors ${
              selectedStatus === "HARUS_DIAJUKAN_BULAN_INI"
                ? "bg-amber-400 text-slate-950 border-amber-400"
                : "bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100"
            }`}
          >
            ⏰ Target Bulan Ini
          </button>

          <button
            onClick={() => onStatusChange("DI_LUAR_APBS")}
            className={`px-3 py-1 rounded-full border text-xs font-bold transition-colors ${
              selectedStatus === "DI_LUAR_APBS"
                ? "bg-purple-700 text-white border-purple-700"
                : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
            }`}
          >
            ⚠️ Di Luar APBS
          </button>

          <button
            onClick={() => onStatusChange("BELUM_DIAJUKAN")}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              selectedStatus === "BELUM_DIAJUKAN"
                ? "bg-slate-200 text-slate-800 border-slate-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            ⏳ Belum Diajukan
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Menampilkan <strong className="text-slate-800">{totalResults}</strong> item APBS
        </span>
      </div>

    </div>
  );
};
