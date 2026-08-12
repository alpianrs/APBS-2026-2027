import React from "react";
import { X, Printer, Download, FileSpreadsheet } from "lucide-react";
import { ApbsRecapItem, ApbsSummaryData } from "../types";
import { formatRupiah } from "../lib/constants";

interface ExportPrintReportProps {
  isOpen: boolean;
  onClose: () => void;
  recapItems: ApbsRecapItem[];
  summary: ApbsSummaryData;
  activeMonthName: string;
}

export const ExportPrintReport: React.FC<ExportPrintReportProps> = ({
  isOpen,
  onClose,
  recapItems,
  summary,
  activeMonthName
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      "Deskripsi Nama Item (Kolom G)",
      "Unit",
      "Kategori",
      "Nomor Rekening",
      "Plafond APBS",
      "Total Pengajuan",
      "Total Realisasi",
      "Sisa APBS",
      "Selisih Dana",
      "Status APBS"
    ];

    const rows = recapItems.map((r) => [
      `"${r.item.name.replace(/"/g, '""')}"`,
      `"${r.item.unit}"`,
      `"${r.item.category}"`,
      `"${r.item.rek}"`,
      r.targetApbsTotal,
      r.totalPengajuan,
      r.totalRealisasi,
      r.sisaApbs,
      r.sisaDanaPengajuan,
      `"${r.statusLabel}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_APBS_Lazuardi_${activeMonthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0 print:static print:z-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 print:shadow-none print:border-none print:max-w-none print:rounded-none">
        
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold text-white">
              Pratinjau Laporan Rekapitulasi APBS Lazuardi
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg text-xs font-semibold flex items-center transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              <span>Export CSV/Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-400 text-slate-950 hover:bg-amber-300 rounded-lg text-xs font-bold flex items-center transition-colors shadow"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper View */}
        <div className="p-8 space-y-6 text-slate-900 font-sans text-xs print:p-4">
          
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-tight">
                LAZUARDI GLOBAL COMPASSIONATE SCHOOL
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Laporan Monitoring Rekapitulasi APBS & Penggunaan Anggaran Sekolah
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Bulan Laporan: <strong>{activeMonthName}</strong> | Cetak: {new Date().toLocaleDateString("id-ID")}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 font-bold text-slate-800 text-xs">
                SISTEM APBS LAZUARDI
              </div>
            </div>
          </div>

          {/* Summary KPI Bar */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Plafond APBS</div>
              <div className="text-sm font-extrabold text-slate-900">{formatRupiah(summary.totalApbs)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Pengajuan</div>
              <div className="text-sm font-extrabold text-blue-700">{formatRupiah(summary.totalPengajuan)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Realisasi</div>
              <div className="text-sm font-extrabold text-emerald-800">{formatRupiah(summary.totalRealisasi)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Sisa APBS</div>
              <div className="text-sm font-extrabold text-slate-900">{formatRupiah(summary.sisaApbs)}</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                  <th className="p-2 border border-slate-300">No</th>
                  <th className="p-2 border border-slate-300">Deskripsi Item (Kolom G)</th>
                  <th className="p-2 border border-slate-300">Unit</th>
                  <th className="p-2 border border-slate-300 text-right">APBS Target</th>
                  <th className="p-2 border border-slate-300 text-right">Pengajuan</th>
                  <th className="p-2 border border-slate-300 text-right">Realisasi</th>
                  <th className="p-2 border border-slate-300 text-right">Sisa APBS</th>
                  <th className="p-2 border border-slate-300 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recapItems.map((r, i) => (
                  <tr key={r.item.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-200 text-center font-semibold">{i + 1}</td>
                    <td className="p-2 border border-slate-200 font-bold">{r.item.name}</td>
                    <td className="p-2 border border-slate-200">{r.item.unit}</td>
                    <td className="p-2 border border-slate-200 text-right font-medium">{formatRupiah(r.targetApbsTotal)}</td>
                    <td className="p-2 border border-slate-200 text-right font-semibold text-blue-800">{formatRupiah(r.totalPengajuan)}</td>
                    <td className="p-2 border border-slate-200 text-right font-bold">{formatRupiah(r.totalRealisasi)}</td>
                    <td className="p-2 border border-slate-200 text-right font-extrabold">{formatRupiah(r.sisaApbs)}</td>
                    <td className="p-2 border border-slate-200 text-center font-semibold">{r.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center print:pt-12">
            <div>
              <p className="text-slate-500">Disusun oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold border-t border-slate-300 pt-1 inline-block px-8">
                Tim Keuangan Lazuardi
              </p>
            </div>
            <div>
              <p className="text-slate-500">Disetujui oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold border-t border-slate-300 pt-1 inline-block px-8">
                Kepala Sekolah / Yayasan
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
