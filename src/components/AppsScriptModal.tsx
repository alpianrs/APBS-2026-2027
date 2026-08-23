import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  FileCode,
  CheckCircle2,
  Info,
  Server,
  KeyRound,
  Link,
  Send,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";
import { ApbsSubmission, ApbsItem } from "../types";
import { executeAppsScriptSync, sanitizeAppsScriptUrl } from "../lib/syncService";

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  submissions: ApbsSubmission[];
  items: ApbsItem[];
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
  onSyncAll: () => Promise<void>;
  isSyncing?: boolean;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  sheetId,
  submissions,
  items,
  webAppUrl,
  onSaveWebAppUrl,
  onSyncAll,
  isSyncing = false
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(webAppUrl);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string>("");
  const [wasDevConverted, setWasDevConverted] = useState<boolean>(false);

  useEffect(() => {
    setInputUrl(webAppUrl);
  }, [webAppUrl]);

  if (!isOpen) return null;

  const appScriptCode = `/**
 * ====================================================================
 * GOOGLE APPS SCRIPT - MONITORING APBS & AUTOMATED LPJ LAZUARDI (V3.2)
 * ====================================================================
 * Fitur:
 * 1. Mendukung Universal GET & POST (Anti-CORS, Bekerja di Vercel, Netlify, Web).
 * 2. Database Tanpa Batas (Unlimited Row Capacity) di tab LOG_PENGAJUAN_LPJ.
 * 3. Otomatisasi Pencatatan Pengajuan & Realisasi LPJ Realtime.
 * 4. Mendukung Sinkronisasi Dua Arah & Hapus dengan PIN Keamanan 123.
 * 5. Menu kustom "🟢 APBS Lazuardi" di Spreadsheet.
 */

// 1. MEMBUAT MENU KUSTOM DI GOOGLE SHEETS
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🟢 APBS Lazuardi')
    .addItem('1. Inisialisasi Tab LOG_PENGAJUAN_LPJ', 'setupLpjLogSheet')
    .addItem('2. Test Webhook APBS', 'testWebhook')
    .addToUi();
}

// 2. MEMBUAT TAB "LOG_PENGAJUAN_LPJ" JIKA BELUM ADA
function setupLpjLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LOG_PENGAJUAN_LPJ');
  
  if (!sheet) {
    sheet = ss.insertSheet('LOG_PENGAJUAN_LPJ');
    
    // Header Kolom Resmi
    const headers = [
      ['ID Transaksi', 'Tanggal Pengajuan', 'Bulan APBS', 'Kode Rekening (#Rek)', 'Nama Item APBS', 'Nominal Pengajuan (Rp)', 'Realisasi LPJ (Rp)', 'Selisih / Sisa Dana', 'Status LPJ', 'No. SPK / Kwitansi', 'Rincian Barang', 'Catatan / Pelapor', 'Status Transaksi']
    ];
    
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    sheet.getRange(1, 1, 1, headers[0].length)
      .setBackground('#0F2C59')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
      
    sheet.setFrozenRows(1);
    SpreadsheetApp.getUi().alert('✅ Tab "LOG_PENGAJUAN_LPJ" berhasil disiapkan!');
  } else {
    SpreadsheetApp.getUi().alert('ℹ️ Tab "LOG_PENGAJUAN_LPJ" sudah tersedia di Spreadsheet ini.');
  }
}

// 3. UNIVERSAL HANDLER UNTUK PROSES DATA (GET & POST)
function handleRequest(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('LOG_PENGAJUAN_LPJ');
    
    if (!sheet) {
      sheet = ss.insertSheet('LOG_PENGAJUAN_LPJ');
      const headers = [
        ['ID Transaksi', 'Tanggal Pengajuan', 'Bulan APBS', 'Kode Rekening (#Rek)', 'Nama Item APBS', 'Nominal Pengajuan (Rp)', 'Realisasi LPJ (Rp)', 'Selisih / Sisa Dana', 'Status LPJ', 'No. SPK / Kwitansi', 'Rincian Barang', 'Catatan / Pelapor', 'Status Transaksi']
      ];
      sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
      sheet.getRange(1, 1, 1, headers[0].length)
        .setBackground('#0F2C59')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }

    // A. TEST PING
    if (!data || data.action === 'ping') {
      return {
        success: true,
        status: 'ok',
        message: '🟢 Webhook Google Apps Script APBS Lazuardi Aktif & Siap Digunakan!'
      };
    }

    // B. AMBIL DATA LPJ (READ)
    if (data.action === 'read') {
      const values = sheet.getDataRange().getValues();
      const rows = [];
      for (let r = 1; r < values.length; r++) {
        if (values[r][0] && values[r][12] !== 'DIHAPUS_PIN_123') {
          rows.push({
            id: values[r][0],
            tanggalPengajuan: values[r][1],
            monthNum: values[r][2],
            rek: values[r][3],
            itemName: values[r][4],
            nominalPengajuan: Number(values[r][5] || 0),
            nominalRealisasi: Number(values[r][6] || 0),
            selisih: Number(values[r][7] || 0),
            status: values[r][8],
            noSpkOrKwitansi: values[r][9],
            catatan: values[r][11]
          });
        }
      }
      return { success: true, submissions: rows, total: rows.length };
    }

    // C. HAPUS PENGAJUAN (VERIFIKASI PIN 123)
    if (data.action === 'delete') {
      if (String(data.pin) !== '123') {
        return { success: false, error: 'PIN Otorisasi Penghapusan Salah!' };
      }

      const values = sheet.getDataRange().getValues();
      let found = false;
      for (let r = 1; r < values.length; r++) {
        if (String(values[r][0]) === String(data.subId || data.id)) {
          sheet.getRange(r + 1, 13).setValue('DIHAPUS_PIN_123');
          sheet.getRange(r + 1, 1, 1, 13).setBackground('#FEE2E2');
          found = true;
          break;
        }
      }

      SpreadsheetApp.flush();
      return {
        success: true,
        message: found ? 'Data pengajuan berhasil ditandai dihapus!' : 'ID transaksi tidak ditemukan di log.'
      };
    }

    // D. SIMPAN ATAU UPDATE PENGAJUAN
    const listToSave = data.submissions || (data.submission ? [data.submission] : (data.id || data.nominalPengajuan ? [data] : []));
    const existingValues = sheet.getDataRange().getValues();
    const existingIdMap = {};
    for (let r = 1; r < existingValues.length; r++) {
      if (existingValues[r][0]) {
        existingIdMap[String(existingValues[r][0])] = r + 1;
      }
    }

    for (let i = 0; i < listToSave.length; i++) {
      const item = listToSave[i];
      if (!item) continue;

      const id = String(item.id || 'SUB-' + new Date().getTime());
      const tgl = item.tanggalPengajuan || new Date().toISOString().split('T')[0];
      const bulan = item.monthNum || '-';
      const rek = item.rek || item.itemRek || '-';
      const name = item.itemName || item.name || '-';
      const nominalPengajuan = Number(item.nominalPengajuan || 0);
      const nominalRealisasi = Number(item.nominalRealisasi || 0);
      const selisih = nominalPengajuan - nominalRealisasi;
      const status = (item.isReported || nominalRealisasi > 0) ? 'SUDAH_DILAPORKAN' : 'BELUM_LAPORAN';
      const noSpk = item.noSpkOrKwitansi || '-';
      const purchaseInfo = item.purchaseItems ? JSON.stringify(item.purchaseItems) : '-';
      const catatan = item.catatan || item.submittedBy || '-';
      const statusTransaksi = 'AKTIF';

      const rowValues = [id, tgl, bulan, rek, name, nominalPengajuan, nominalRealisasi, selisih, status, noSpk, purchaseInfo, catatan, statusTransaksi];

      if (existingIdMap[id]) {
        sheet.getRange(existingIdMap[id], 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
    }

    SpreadsheetApp.flush();
    return {
      success: true,
      count: listToSave.length,
      message: 'Berhasil mencatat ' + listToSave.length + ' data ke tab LOG_PENGAJUAN_LPJ!'
    };
    
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// 4. MENERIMA PERMINTAAN GET DARI WEB / BROWSER
function doGet(e) {
  let data = {};
  if (e && e.parameter) {
    if (e.parameter.data) {
      try { data = JSON.parse(e.parameter.data); } catch(x) {}
    } else {
      data = e.parameter;
    }
  }
  const result = handleRequest(data);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 5. MENERIMA PERMINTAAN POST DARI APLIKASI
function doPost(e) {
  let data = {};
  try {
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }
  } catch (err) {
    data = (e && e.parameter) ? e.parameter : {};
  }
  const result = handleRequest(data);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function testWebhook() {
  SpreadsheetApp.getUi().alert('🟢 Google Apps Script APBS Lazuardi Aktif dan Siap Digunakan!');
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUrlInputChange = (val: string) => {
    setInputUrl(val);
    if (val.includes("/macros/s/") && (val.endsWith("/dev") || val.includes("/dev?"))) {
      setWasDevConverted(true);
    } else {
      setWasDevConverted(false);
    }
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeAppsScriptUrl(inputUrl);

    if (cleanUrl.includes("docs.google.com/spreadsheets")) {
      setTestStatus("error");
      setTestMessage("⚠️ Link yang dimasukkan adalah URL Spreadsheet. Gunakan URL Web App Apps Script (berakhiran /exec).");
      return;
    }

    if (inputUrl.includes("/dev")) {
      setInputUrl(cleanUrl);
      setWasDevConverted(true);
    }

    onSaveWebAppUrl(cleanUrl);
    setTestStatus("success");
    setTestMessage("✅ URL Web App berhasil disimpan & dinormalisasi (/exec)!");
  };

  const handleTestConnection = async () => {
    const rawUrl = inputUrl.trim();
    if (!rawUrl) {
      setTestStatus("error");
      setTestMessage("Masukkan URL Web App Apps Script terlebih dahulu.");
      return;
    }

    if (rawUrl.includes("docs.google.com/spreadsheets")) {
      setTestStatus("error");
      setTestMessage("⚠️ URL yang Anda masukkan adalah link Spreadsheet Google Sheet. Anda perlu menerapkan Web App dari menu Ekstensi -> Apps Script dan menggunakan URL yang berakhiran /exec.");
      return;
    }

    const cleanUrl = sanitizeAppsScriptUrl(rawUrl);
    if (rawUrl.includes("/dev")) {
      setInputUrl(cleanUrl);
      setWasDevConverted(true);
    }

    setTestStatus("testing");
    setTestMessage("Menguji koneksi ke Google Apps Script Web App...");

    try {
      const data = await executeAppsScriptSync({
        webAppUrl: cleanUrl,
        action: "ping"
      });

      if (data.success) {
        setTestStatus("success");
        setTestMessage("✅ Koneksi Berhasil! Google Apps Script siap mencatat pengajuan & LPJ secara real-time.");
        onSaveWebAppUrl(cleanUrl);
      } else {
        setTestStatus("error");
        setTestMessage(`⚠️ ${data.message || data.error || "Gagal menghubungi Apps Script. Pastikan Deploy sebagai Web App dengan akses 'Anyone'."}`);
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(`❌ Error: ${err.message || "Gagal melakukan koneksi ke URL"}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1855C6] px-6 py-4 text-white border-b-2 border-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <FileCode className="w-5 h-5 text-[#0F2C59]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Integrasi Otomatis Google Sheets & LPJ Real-Time
              </h3>
              <p className="text-xs text-blue-100/90">
                Pencatatan Otomatis Tanpa Batas ke Tab <code>LOG_PENGAJUAN_LPJ</code> di Google Sheet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Important CORS / /dev vs /exec Explanatory Banner */}
          <div className="bg-amber-50 border-2 border-amber-400/80 rounded-2xl p-4 space-y-2 text-amber-950 shadow-xs">
            <div className="flex items-center space-x-2 font-black text-xs text-amber-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Solusi Error CORS & Masalah Pengajuan Tidak Masuk ke Sheet</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Google Apps Script memblokir akses jika menggunakan URL Test Mode (<strong><code>/dev</code></strong>). Pastikan selalu menggunakan URL Production Web App yang berakhiran <strong><code>/exec</code></strong> dengan hak akses <strong>"Siapa saja" (Anyone)</strong>.
            </p>
          </div>

          {/* Web App URL Connection Section */}
          <div className="bg-blue-50/80 border-2 border-blue-300 rounded-2xl p-4.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link className="w-4 h-4 text-[#1855C6]" />
                <h4 className="font-extrabold text-[#0F2C59] text-sm">
                  Koneksi Webhook Google Apps Script (Web App URL)
                </h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                webAppUrl
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}>
                {webAppUrl ? "🟢 Webhook Terhubung" : "⚠️ Belum Terhubung"}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Setelah menerapkan (*Deploy*) script di bawah sebagai <strong>Aplikasi Web (Web App)</strong>, tempelkan link URL Web App di sini agar setiap tombol <strong>"Ajukan"</strong> atau <strong>"LPJ"</strong> langsung tercatat otomatis di Google Sheet Anda:
            </p>

            <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => handleUrlInputChange(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-[#1855C6] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0F2C59] hover:bg-[#1855C6] text-white font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  Simpan URL
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === "testing"}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl transition-all shadow-xs shrink-0 flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                  <span>Test Koneksi</span>
                </button>
              </div>
            </form>

            {wasDevConverted && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-[11px] text-emerald-900 font-semibold flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>URL <code>/dev</code> otomatis dinormalisasi ke <code>/exec</code> agar tidak terblokir CORS oleh Google.</span>
              </div>
            )}

            {testMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                testStatus === "success"
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : testStatus === "error"
                  ? "bg-rose-100 text-rose-900 border border-rose-300"
                  : "bg-blue-100 text-blue-900 border border-blue-300"
              }`}>
                {testStatus === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : testStatus === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <span>{testMessage}</span>
              </div>
            )}

            {/* Sync All Pending Submissions Button */}
            {submissions.length > 0 && (
              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-slate-600">
                  Terdapat <strong>{submissions.length}</strong> data pengajuan di aplikasi.
                </span>
                <button
                  type="button"
                  onClick={onSyncAll}
                  disabled={isSyncing || !inputUrl}
                  className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Semua Data ke Google Sheet"}</span>
                </button>
              </div>
            )}
          </div>

          {/* 4 Steps Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h4 className="font-extrabold text-[#0F2C59] flex items-center text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
              Langkah Singkat Pemasangan Webhook di Google Sheet:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1 leading-relaxed">
              <li>
                Buka Spreadsheet Google Sheet APBS Lazuardi Anda:{" "}
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center font-bold text-[#1855C6] hover:underline"
                >
                  Buka Spreadsheet <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>
                Di menu bar Google Sheet, klik: <strong>Ekstensi (Extensions)</strong> &rarr; <strong>Apps Script</strong>.
              </li>
              <li>
                Hapus semua kode lama di editor, lalu klik tombol <strong>"Salin Script"</strong> di bawah dan <strong>Paste (Tempel)</strong> ke Apps Script. Klik <strong>Simpan (Save / Ikon Disket)</strong>.
              </li>
              <li>
                Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &rarr; pilih <strong>Deployment Baru (New deployment)</strong>:
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-1.5 text-[11px] text-amber-950 font-medium space-y-1">
                  <div>• <strong>Jenis:</strong> Pilih ikon gerigi &rarr; <strong>Aplikasi Web (Web app)</strong></div>
                  <div>• <strong>Jalankan sebagai (Execute as):</strong> <em>Saya (email Anda / Alpianrs@lazuardi.sch.id)</em></div>
                  <div>• <strong>Siapa yang memiliki akses (Who has access):</strong> <em>Siapa saja (Anyone)</em></div>
                  <div className="text-rose-900 font-bold pt-1 border-t border-amber-200">
                    ⚠️ PENTING: Jangan gunakan URL 'Uji Deployment' (/dev). Salin URL Deployment Resmi yang berakhiran <code>/exec</code>!
                  </div>
                </div>
              </li>
              <li>
                Setelah muncul jendela konfirmasi, klik <strong>Salin (Copy)</strong> pada <strong>URL Aplikasi Web (Web App URL)</strong> yang berakhiran <code>/exec</code>, lalu tempelkan ke kolom URL di atas dan klik <strong>Simpan URL</strong>.
              </li>
            </ol>
          </div>

          {/* Code Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F2C59] flex items-center text-xs">
                <Server className="w-4 h-4 mr-1.5 text-amber-600" /> Kode Script Otomatisasi (Code.gs):
              </span>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-[#0F2C59] text-white hover:bg-[#1855C6]"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Berhasil Disalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1 text-amber-300" />
                    Salin Script Apps Script
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-amber-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                {appScriptCode}
              </pre>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-[11px] font-medium flex items-center">
            <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600" /> Otorisasi Hapus: PIN 123
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
