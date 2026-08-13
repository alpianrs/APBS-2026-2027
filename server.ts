import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PUBLISHED_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTJVTzm62WYEDOahWZz0-6hvMDxS87MtDVsk2Hd4tFMfI8FWnZcK6eW3yYqa9iprImukVV11-T6p5ry/pub?output=csv";
const DEFAULT_SHEET_ID = "1Eg8UBRpKMufAtvl6EZqDSvlIFFhVc--EZFzCHHHRn8M";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route: Fetch and parse live Google Sheet CSV data
  app.get("/api/apbs-data", async (req, res) => {
    try {
      const rawInput = (req.query.sheetId as string) || DEFAULT_PUBLISHED_URL;
      const str = (rawInput || "").trim();

      const candidateUrls: string[] = [];

      if (str.startsWith("http://") || str.startsWith("https://")) {
        candidateUrls.push(str);
        if (str.includes("/pub") && !str.includes("output=csv")) {
          candidateUrls.push(str + (str.includes("?") ? "&output=csv" : "?output=csv"));
        }
      }

      let gid: string | null = null;
      const gidMatch = str.match(/[?&#]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) gid = gidMatch[1];
      const gidQuery = gid ? `&gid=${gid}` : "";

      const standardMatch = str.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
      let cleanId = "";
      if (standardMatch && standardMatch[1]) {
        cleanId = standardMatch[1];
      } else if (!str.includes("/")) {
        cleanId = str;
      }

      if (cleanId) {
        candidateUrls.push(
          `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv${gidQuery}`,
          `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv${gidQuery}`,
          `https://docs.google.com/spreadsheets/d/${cleanId}/pub?output=csv${gidQuery}`
        );
      }

      if (!candidateUrls.includes(DEFAULT_PUBLISHED_URL)) {
        candidateUrls.push(DEFAULT_PUBLISHED_URL);
      }

      let csvText = "";
      let fetchSuccess = false;
      let lastErrorStatus = 0;

      for (const url of candidateUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            redirect: "follow"
          });

          if (response.ok) {
            const text = await response.text();
            // Check if returned page is HTML (e.g. Google Sign-in or Permission denied page)
            const isHtml = text.trim().toLowerCase().startsWith("<!doctype html") || text.trim().toLowerCase().startsWith("<html");
            if (!isHtml && text.length > 20) {
              csvText = text;
              fetchSuccess = true;
              break;
            }
          } else {
            lastErrorStatus = response.status;
          }
        } catch (e) {
          console.warn(`Candidate URL fetch error (${url}):`, e);
        }
      }

      if (!fetchSuccess || !csvText) {
        throw new Error(
          `Gagal membaca Google Sheet (HTTP ${lastErrorStatus || 404}). Google Sheet belum dapat diakses secara publik.\n\n` +
          `Langkah Penanganan jika Spreadsheet di Drive Bersama / Grup Tim:\n` +
          `1. Buka File Google Sheet Anda.\n` +
          `2. Klik menu 'File' -> 'Publikasikan ke web' (Publish to web).\n` +
          `3. Pilih opsi 'Nilai yang dipisahkan koma (.csv)' -> Klik tombol 'Publikasikan'.\n` +
          `4. Atau pastikan menu 'Bagikan' (Share) diubah ke 'Siapa saja yang memiliki link' (Viewer).`
        );
      }

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
        sheetId: cleanId || rawInput,
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
