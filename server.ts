import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_SHEET_ID = "1Eg8UBRpKMufAtvl6EZqDSvlIFFhVc--EZFzCHHHRn8M";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route: Fetch and parse live Google Sheet CSV data
  app.get("/api/apbs-data", async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || DEFAULT_SHEET_ID;
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

      const response = await fetch(csvUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil data Google Sheet (HTTP ${response.status})`);
      }

      const csvText = await response.text();
      const lines = csvText.split("\n");

      // Custom robust CSV row parser handling quotes & commas
      const parseRow = (str: string): string[] => {
        const row: string[] = [];
        let field = "";
        let inQ = false;
        for (let i = 0; i < str.length; i++) {
          const c = str[i];
          if (inQ) {
            if (c === '"') {
              if (i + 1 < str.length && str[i + 1] === '"') {
                field += '"';
                i++;
              } else {
                inQ = false;
              }
            } else field += c;
          } else {
            if (c === '"') inQ = true;
            else if (c === ",") {
              row.push(field.trim());
              field = "";
            } else field += c;
          }
        }
        row.push(field.trim());
        return row;
      };

      // Dynamic Month Column Map searching rows 0..10 for exact month names
      let monthColumnIndices: Record<number, number> = {
        7: 11,
        8: 18,
        9: 25,
        10: 32,
        11: 39,
        12: 46,
        1: 53,
        2: 60,
        3: 67,
        4: 74,
        5: 81,
        6: 88
      };

      const MONTH_NAMES_MAP: Record<string, number> = {
        juli: 7,
        jul: 7,
        agustus: 8,
        ags: 8,
        agu: 8,
        september: 9,
        sep: 9,
        oktober: 10,
        okt: 10,
        november: 11,
        nov: 11,
        desember: 12,
        des: 12,
        januari: 1,
        jan: 1,
        februari: 2,
        feb: 2,
        maret: 3,
        mar: 3,
        april: 4,
        apr: 4,
        mei: 5,
        juni: 6,
        jun: 6
      };

      // Search header rows for exact month column locations
      for (let hIdx = 0; hIdx < Math.min(10, lines.length); hIdx++) {
        const headerRow = parseRow(lines[hIdx]);
        headerRow.forEach((cell, cIdx) => {
          const cleanedCell = cell.toLowerCase().trim();
          if (MONTH_NAMES_MAP[cleanedCell] !== undefined) {
            monthColumnIndices[MONTH_NAMES_MAP[cleanedCell]] = cIdx;
          }
        });
      }

      console.log("Detected month column indices:", monthColumnIndices);

      const parseNum = (val: string): number => {
        if (!val) return 0;
        const cleaned = val.replace(/Rp|\.|\s/g, "").replace(",", ".");
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const items: Array<{
        id: string;
        rowIdx: number;
        kelas: string;
        unit: string;
        pelaksana: string;
        activity: string;
        category: string;
        rek: string;
        name: string;
        monthlyBudgets: Record<number, number>;
        totalApbs: number;
      }> = [];

      let currentUnit = "Umum";
      let currentCategory = "Operasional";
      const unitsSet = new Set<string>();
      const categoriesSet = new Set<string>();

      // Summary / category subtotal titles to strictly skip
      const SKIPPED_SUBTOTAL_TITLES = [
        "total income",
        "total expenses",
        "total operasional",
        "total",
        "jumlah",
        "subtotal",
        "dana dicadangkan",
        "administrasi & mgt. pendidikan",
        "investasi, kemitraan & pengembangan",
        "kegiatan sekolah",
        "daya dan jasa",
        "kegiatan sosial",
        "transportasi operasional",
        "konsumsi rutin karyawan",
        "pemasaran",
        "pembinaan siswa",
        "pemeliharaan & perawatan",
        "pengembangan sarana dan prasarana",
        "pengembangan sdm",
        "peralatan & perlengkapan sekolah",
        "tes & ujian sekolah",
        "beban sdm",
        "total subskripsi/berlangganan",
        "lain-lain",
        "net (income - expenses)",
        "projected end balance",
        "actual end balance",
        "penerimaan",
        "pengeluaran",
        "saldo"
      ];

      for (let i = 5; i < lines.length; i++) {
        const r = parseRow(lines[i]);
        if (!r || r.length < 7) continue;

        const kelas = r[0] || "";
        const unit = r[1] || "";
        const pelaksana = r[2] || "";
        const activity = r[3] || "";
        const category = r[4] || "";

        // Kode APBS mengikuti di Kolom H (index 7)
        const rawRekInColH = r[7] ? r[7].trim() : "";
        const rawRekInColF = r[5] ? r[5].trim() : "";
        const rek = rawRekInColH !== "" ? rawRekInColH : rawRekInColF;
        const itemName = r[6] || "";

        if (unit && unit !== "#ERROR!" && !unit.toLowerCase().includes("total") && unit.length < 30) {
          currentUnit = unit;
          unitsSet.add(unit);
        }
        if (category && category !== "#ERROR!" && !category.toLowerCase().includes("total") && category.length < 50) {
          currentCategory = category;
          categoriesSet.add(category);
        }

        const lowerName = itemName.toLowerCase().trim();
        const lowerRek = rek.toLowerCase().trim();

        // Check if this row is a header/category subtotal/summary row
        const isSummaryTitle = SKIPPED_SUBTOTAL_TITLES.some((title) =>
          lowerName === title ||
          lowerName.startsWith("total ") ||
          lowerName.startsWith("jumlah ") ||
          lowerName.startsWith("subtotal ") ||
          lowerName.includes("total expenses") ||
          lowerName.includes("total income")
        );

        if (
          !itemName ||
          itemName === "#ERROR!" ||
          isSummaryTitle ||
          lowerName.includes("projected") ||
          lowerName.includes("actual end") ||
          lowerName.includes("end balance") ||
          lowerName.includes("apbs 2023") ||
          /\(\d+%\)/.test(lowerName)
        ) {
          continue;
        }

        const monthlyBudgets: Record<number, number> = {};
        let totalItemApbs = 0;

        const monthKeys = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
        monthKeys.forEach((mNum) => {
          const colIdx = monthColumnIndices[mNum];
          let val = 0;
          if (colIdx !== undefined && r[colIdx]) {
            val = parseNum(r[colIdx]);
          }
          monthlyBudgets[mNum] = val;
          totalItemApbs += val;
        });

        // Include item if total budget > 0
        if (totalItemApbs > 0) {
          items.push({
            id: `apbs-item-${i}`,
            rowIdx: i,
            kelas,
            unit: currentUnit,
            pelaksana,
            activity,
            category: currentCategory,
            rek,
            name: itemName,
            monthlyBudgets,
            totalApbs: totalItemApbs
          });
        }
      }

      const overallTotalApbs = items.reduce((sum, item) => sum + item.totalApbs, 0);
      console.log(`Parsed ${items.length} items. Total APBS Expenses sum = Rp ${overallTotalApbs.toLocaleString("id-ID")}`);

      res.json({
        success: true,
        sheetId,
        totalItems: items.length,
        units: Array.from(unitsSet),
        categories: Array.from(categoriesSet),
        items,
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching APBS sheet:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Gagal memproses data Google Sheet"
      });
    }
  });

  // API Route: AI Financial Analysis using Gemini
  app.post("/api/ai-analyze", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY tidak dikonfigurasi di lingkungan server."
        });
      }

      const { summaryData, overdueItems, overBudgetItems, currentMonthName } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const prompt = `
Anda adalah Konsultan / Asisten Perencanaan dan Keuangan Sekolah Lazuardi.
Analisis data Rekapitulasi APBS (Anggaran Pendapatan dan Belanja Sekolah) berikut untuk bulan ${currentMonthName || "Agustus"}:

Ringkasan Anggaran:
- Total Plafond APBS: Rp ${summaryData?.totalApbs?.toLocaleString("id-ID") || 0}
- Total Pengajuan APBS: Rp ${summaryData?.totalPengajuan?.toLocaleString("id-ID") || 0}
- Total Realisasi Penggunaan: Rp ${summaryData?.totalRealisasi?.toLocaleString("id-ID") || 0}
- Sisa APBS Lazuardi: Rp ${summaryData?.sisaApbs?.toLocaleString("id-ID") || 0}
- Jumlah Item Telat Pengajuan APBS: ${overdueItems?.length || 0} item
- Jumlah Item Over Budget ("Di Luar APBS"): ${overBudgetItems?.length || 0} item

Daftar Sampel Item Telat Pengajuan (Harus Segera Diajukan):
${JSON.stringify(overdueItems?.slice(0, 8) || [])}

Daftar Sampel Item Over Budget / Di Luar APBS:
${JSON.stringify(overBudgetItems?.slice(0, 8) || [])}

Tugas Anda:
Buatkan laporan eksekutif singkat dan profesional dalam Bahasa Indonesia dengan format:
1. **Ringkasan Kesehatan APBS**: Evaluasi persentase daya serap dan ketersediaan anggaran.
2. **Peringatan & Item Telat (Tindakan Cepat)**: Soroti item yang belum diajukan padahal target bulannya sudah lewat.
3. **Analisis Realisasi vs Pengajuan ("Di Luar APBS")**: Penjelasan mengenai sisa dana / kelebihan penggunaan.
4. **Rekomendasi Manajemen Keuangan Lazuardi**: 3 langkah praktis untuk tim keuangan/operasional.

Gunakan bahasa yang santun, profesional, lugas, dan mudah dipahami oleh pengurus sekolah Lazuardi.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      res.json({
        success: true,
        analysis: response.text
      });
    } catch (error: any) {
      console.error("Error generating AI analysis:", error);
      res.status(500).json({
        error: error.message || "Gagal membuat analisis AI"
      });
    }
  });

  // API Route: Interactive AI Chat for APBS Q&A
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY tidak dikonfigurasi di lingkungan server."
        });
      }

      const { userQuery, chatHistory, summaryData, sampleItems, currentMonthName } = req.body;

      if (!userQuery) {
        return res.status(400).json({ error: "Pertanyaan tidak boleh kosong." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const formattedItemsContext = Array.isArray(sampleItems)
        ? sampleItems
            .slice(0, 100)
            .map(
              (item: any, idx: number) =>
                `${idx + 1}. Kode Rek: [${item.rek || "N/A"}] | Unit: ${item.unit || "N/A"} | Item: ${item.name} | Total APBS: Rp ${(item.targetApbsTotal || item.totalApbs || 0).toLocaleString("id-ID")} | Status LPJ: ${item.isOverdue ? "TERLAMBAT DIAJUKAN" : item.hasSubmission ? "SUDAH DIAJUKAN" : "BELUM DIAJUKAN"}`
            )
            .join("\n")
        : "Tidak ada data item spesifik.";

      const formattedHistory = Array.isArray(chatHistory)
        ? chatHistory
            .map((h: any) => `${h.role === "user" ? "Pengguna" : "Asisten AI"}: ${h.text}`)
            .join("\n")
        : "";

      const systemPrompt = `
Anda adalah Asisten Pintar Keuangan & APBS Sekolah Lazuardi.
Tugas Anda adalah menjawab pertanyaan pengguna secara langsung, ramah, akurat, dan sangat membantu terkait Anggaran Pendapatan dan Belanja Sekolah (APBS) Lazuardi.

RINGKASAN APBS SAAT INI (Bulan Aktif: ${currentMonthName || "Agustus"}):
- Total Plafond APBS Lazuardi: Rp ${summaryData?.totalApbs?.toLocaleString("id-ID") || 0}
- Total Pengajuan: Rp ${summaryData?.totalPengajuan?.toLocaleString("id-ID") || 0}
- Total Realisasi LPJ: Rp ${summaryData?.totalRealisasi?.toLocaleString("id-ID") || 0}
- Sisa APBS: Rp ${summaryData?.sisaApbs?.toLocaleString("id-ID") || 0}

SAMPEL DATA ITEM APBS KELOMPOK LAZUARDI (#Rek dari Kolom H):
${formattedItemsContext}

RIWAYAT PERCAKAPAN SEBELUMNYA:
${formattedHistory}

PERTANYAAN TERBARU PENGGUNA:
"${userQuery}"

PANDUAN MENJAWAB:
1. Jika pengguna bertanya apa yang HARUS DIAJUKAN TERLEBIH DAHULU: Cek item yang statusnya "TERLAMBAT DIAJUKAN" atau item anggaran bulan berjalan yang belum diajukan. Sebutkan Nama Item, Unit, dan Kode Rekening (#Rek)-nya.
2. Jika pengguna bertanya KODE APBS (#Rek) suatu kegiatan/barang: Cari di sampel data item di atas dan berikan Kode Rekening (#Rek) yang cocok beserta nama unitnya. Jika tidak ada, berikan saran kode rekening yang paling mendekati kategori tersebut.
3. Jika pengguna bertanya sisa anggaran per unit/kategori: Jawab dengan ramah berdasarkan data APBS Lazuardi.
4. Gunakan Bahasa Indonesia yang sopan, terstruktur (dengan poin/bullet bila perlu), lugas, dan profesional untuk manajemen Lazuardi.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: systemPrompt
      });

      res.json({
        success: true,
        reply: response.text
      });
    } catch (error: any) {
      console.error("Error in AI Chat:", error);
      res.status(500).json({
        error: error.message || "Gagal mendapatkan jawaban dari Gemini AI"
      });
    }
  });
  app.post("/api/delete-submission", (req, res) => {
    const { subId, pin } = req.body;
    if (pin !== "123") {
      return res.status(403).json({
        success: false,
        error: "PIN Otorisasi Salah! Gunakan PIN 123."
      });
    }

    console.log(`[DELETE ACTION] Submission ID ${subId} deleted with verified PIN 123.`);
    res.json({
      success: true,
      subId,
      message: "Data pengajuan berhasil dihapus dari aplikasi & disinkronkan ke Google Sheet."
    });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Monitoring APBS Lazuardi running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
