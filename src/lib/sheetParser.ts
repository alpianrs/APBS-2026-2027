import { ApbsItem, ApbsSubmission } from "../types";

export const DEFAULT_SHEET_ID = "1Eg8UBRpKMufAtvl6EZqDSvlIFFhVc--EZFzCHHHRn8M";
export const DEFAULT_PUBLISHED_URL =
  `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/gviz/tq?tqx=out:csv`;

export interface ParsedSheetData {
  sheetId: string;
  totalItems: number;
  units: string[];
  categories: string[];
  items: ApbsItem[];
  updatedAt: string;
}

export function getCandidateCsvUrls(inputUrlOrId: string): string[] {
  const str = (inputUrlOrId || "").trim();
  const candidateUrls: string[] = [];

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

  if (str.startsWith("http://") || str.startsWith("https://")) {
    if (str.includes("/pub") && !candidateUrls.includes(str)) {
      candidateUrls.unshift(str + (str.includes("output=csv") ? "" : (str.includes("?") ? "&output=csv" : "?output=csv")));
    } else if (!candidateUrls.includes(str)) {
      candidateUrls.push(str);
    }
  }

  if (!candidateUrls.includes(DEFAULT_PUBLISHED_URL)) {
    candidateUrls.push(DEFAULT_PUBLISHED_URL);
  }

  return candidateUrls;
}

export function parseRow(str: string): string[] {
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
}

export const parseNum = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/Rp|\.|\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

export function parseLpjCsvText(csvText: string, apbsItems: ApbsItem[] = []): ApbsSubmission[] {
  const lines = csvText.split("\n");
  if (lines.length <= 1) return [];

  const submissions: ApbsSubmission[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (!row || row.length < 5) continue;

    const id = row[0] || `sub-sheet-${i}`;
    const tanggalPengajuan = row[1] || "";
    const monthNum = parseInt(row[2]) || 7;
    const rek = row[3] || "";
    const itemName = row[4] || "";
    const nominalPengajuan = parseNum(row[5] || "0");
    const nominalRealisasi = parseNum(row[6] || "0");
    const statusLpj = (row[8] || "").toUpperCase();
    const noSpkOrKwitansi = row[9] || "";
    const purchaseInfo = row[10] || "";
    const catatan = row[11] || "";
    const statusTransaksi = (row[12] || "AKTIF").toUpperCase();

    // If marked as deleted with PIN, skip it
    if (statusTransaksi.includes("DIHAPUS")) {
      continue;
    }

    // Match with apbsItems
    let matchedItemId = "";
    if (apbsItems.length > 0) {
      const match = apbsItems.find(
        (it) => (rek && it.rek === rek) || (itemName && it.name.trim().toLowerCase() === itemName.trim().toLowerCase())
      );
      if (match) {
        matchedItemId = match.id;
      }
    }

    let purchaseItems = [];
    if (purchaseInfo && purchaseInfo.startsWith("[")) {
      try {
        purchaseItems = JSON.parse(purchaseInfo);
      } catch {
        purchaseItems = [];
      }
    }

    submissions.push({
      id,
      itemId: matchedItemId || (rek ? `rek-${rek}` : `item-${i}`),
      monthNum,
      nominalPengajuan,
      nominalRealisasi,
      tanggalPengajuan,
      isReported: statusLpj.includes("SUDAH") || nominalRealisasi > 0,
      noSpkOrKwitansi,
      catatan,
      purchaseItems
    });
  }

  return submissions;
}

export function parseApbsCsvText(csvText: string, rawInput: string): ParsedSheetData {
  const lines = csvText.split("\n");

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

  for (let hIdx = 0; hIdx < Math.min(10, lines.length); hIdx++) {
    const headerRow = parseRow(lines[hIdx]);
    headerRow.forEach((cell, cIdx) => {
      const cleanedCell = cell.toLowerCase().trim();
      if (MONTH_NAMES_MAP[cleanedCell] !== undefined) {
        monthColumnIndices[MONTH_NAMES_MAP[cleanedCell]] = cIdx;
      }
    });
  }

  const parseNum = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.replace(/Rp|\.|\s/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const items: ApbsItem[] = [];
  let currentUnit = "Umum";
  let currentCategory = "Operasional";
  const unitsSet = new Set<string>();
  const categoriesSet = new Set<string>();

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

    const isSummaryTitle = SKIPPED_SUBTOTAL_TITLES.some(
      (title) =>
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

  return {
    sheetId: rawInput,
    totalItems: items.length,
    units: Array.from(unitsSet),
    categories: Array.from(categoriesSet),
    items,
    updatedAt: new Date().toISOString()
  };
}

export async function fetchDirectCsvData(sheetId: string): Promise<ParsedSheetData> {
  const candidateUrls = getCandidateCsvUrls(sheetId);
  let csvText = "";
  let lastErrorStatus = 0;

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        redirect: "follow"
      });

      if (res.ok) {
        const text = await res.text();
        const isHtml = text.trim().toLowerCase().startsWith("<!doctype html") || text.trim().toLowerCase().startsWith("<html");
        if (!isHtml && text.length > 20) {
          csvText = text;
          break;
        }
      } else {
        lastErrorStatus = res.status;
      }
    } catch (e) {
      console.warn("Direct CSV fetch error:", e);
    }
  }

  if (!csvText) {
    throw new Error(
      `Gagal membaca data Google Sheet (HTTP ${lastErrorStatus || 404}).\n` +
      `Pastikan Google Sheet dipublikasikan: File -> Publikasikan ke web -> CSV.`
    );
  }

  return parseApbsCsvText(csvText, sheetId);
}
