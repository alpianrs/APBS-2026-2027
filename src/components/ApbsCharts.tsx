import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { ApbsRecapItem } from "../types";
import { LAZUARDI_MONTHS, formatRupiah } from "../lib/constants";

interface ApbsChartsProps {
  recapItems: ApbsRecapItem[];
}

export const ApbsCharts: React.FC<ApbsChartsProps> = ({ recapItems }) => {
  // 1. Calculate Monthly Biaya Total Sudah Diajukan & Realisasi LPJ across all items
  const monthlyData = LAZUARDI_MONTHS.map((m) => {
    let totalDiajukanSum = 0;
    let realisasiLpjSum = 0;

    recapItems.forEach((r) => {
      const monthSubs = r.submissionsForMonth.filter((s) => s.monthNum === m.num);
      monthSubs.forEach((s) => {
        totalDiajukanSum += s.nominalPengajuan || 0;
        realisasiLpjSum += s.nominalRealisasi || 0;
      });
    });

    return {
      monthName: m.name,
      order: m.order,
      "Biaya Diajukan": totalDiajukanSum,
      "Realisasi LPJ": realisasiLpjSum
    };
  });

  // 2. Unit distribution data: Total Sudah Diajukan vs Belum LPJ per Unit
  const unitStatsMap: Record<
    string,
    { unitName: string; sudahDiajukan: number; belumLaporan: number }
  > = {};

  recapItems.forEach((r) => {
    const unit = r.item.unit || "Lainnya";
    if (!unitStatsMap[unit]) {
      unitStatsMap[unit] = {
        unitName: unit,
        sudahDiajukan: 0,
        belumLaporan: 0
      };
    }

    unitStatsMap[unit].sudahDiajukan += r.totalPengajuan || 0;

    // Calculate pending report amount (belum dilaporkan)
    r.submissionsForMonth.forEach((s) => {
      if (s.nominalPengajuan > 0 && (!s.isReported || s.nominalRealisasi === 0)) {
        unitStatsMap[unit].belumLaporan += s.nominalPengajuan;
      }
    });
  });

  const unitData = Object.values(unitStatsMap)
    .sort((a, b) => b.sudahDiajukan - a.sudahDiajukan)
    .slice(0, 8);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md mb-6 space-y-6">
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-[#0F2C59]">
            📊 Visualisasi Biaya Diajukan & LPJ Per Unit Lazuardi
          </h3>
          <p className="text-xs text-slate-500">
            Grafik pemantauan biaya total yang sudah diajukan serta status kelengkapan laporan realisasi (LPJ).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly Biaya Total Sudah Diajukan Bar Chart */}
        <div className="lg:col-span-7 bg-slate-50/80 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-3">
            <h4 className="text-xs font-black text-[#0F2C59]">
              Biaya Total Sudah Diajukan Per Bulan (Juli - Juni)
            </h4>
            <p className="text-[11px] text-slate-500">
              Total nominal pengajuan proposal anggaran per bulan berjalan
            </p>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="monthName" tick={{ fontSize: 10, fontWeight: "bold" }} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#0F2C59", borderRadius: "10px", color: "#fff", border: "1px solid #f59e0b" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="Biaya Diajukan" name="Total Biaya Diajukan" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realisasi LPJ" name="Realisasi LPJ" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unit Breakdown: Sudah Diajukan vs Belum Laporan */}
        <div className="lg:col-span-5 bg-slate-50/80 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-3">
            <h4 className="text-xs font-black text-[#0F2C59]">
              Pengajuan vs Belum Laporan (LPJ) Per Unit
            </h4>
            <p className="text-[11px] text-slate-500">
              Perbandingan total yang sudah diajukan & yang masih tunggakan LPJ
            </p>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={unitData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis dataKey="unitName" type="category" width={80} tick={{ fontSize: 10, fontWeight: "bold" }} />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#0F2C59", borderRadius: "10px", color: "#fff", border: "1px solid #f59e0b" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="sudahDiajukan" name="Sudah Diajukan" fill="#2563EB" radius={[0, 4, 4, 0]} />
                <Bar dataKey="belumLaporan" name="Belum LPJ" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
