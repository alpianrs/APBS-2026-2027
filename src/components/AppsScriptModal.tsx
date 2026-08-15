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
  ExternalLink
} from "lucide-react";
import { ApbsSubmission, ApbsItem } from "../types";

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

  useEffect(() => {
    setInputUrl(webAppUrl);
  }, [webAppUrl]);

  if (!isOpen) return null;

  const appScriptCode = `/**
 * ====================================================================
 * GOOGLE APPS SCRIPT - MONITORING APBS & AUTOMATED LPJ LAZUARDI (V2.1)
 * ====================================================================
 * Fitur Lengkap:
 * 1. Otomatisasi Pencatatan Pengajuan & Realisasi LPJ langsung ke tab LOG_PENGAJUAN_LPJ.
 * 2. Mendukung Sinkronisasi Dua Arah & Hapus dengan PIN Keamanan 123.
 * 3. Pembacaan Kode Rekening APBS (#Rek) dari Kolom H (index 7).
 * 4. Menu kustom "🟢 APBS Lazuardi" di Spreadsheet.
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

// 3. MENERIMA TEST PING DARI APLIKASI (GET)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Webhook Google Apps Script APBS Lazuardi Aktif & Siap Digunakan!'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 4. WEBHOOK PENERIMA DATA DARI WEB APP (POST)
function doPost(e) {
  try {
    const rawContent = (e && e.postData) ? e.postData.contents : '{}';
    const data = JSON.parse(rawContent);
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

    // A. PENANGANAN AKSI HAPUS PENGAJUAN (VERIFIKASI PIN 123)
    if (data.action === 'delete') {
      if (data.pin !== '123') {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'PIN Otorisasi Penghapusan Salah!'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const values = sheet.getDataRange().getValues();
      let found = false;
      for (let r = 1; r < values.length; r++) {
        if (values[r][0] === data.subId) {
          sheet.getRange(r + 1, 13).setValue('DIHAPUS_PIN_123');
          sheet.getRange(r + 1, 1, 1, 13).setBackground('#FEE2E2');
          found = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: found ? 'Data pengajuan berhasil ditandai dihapus!' : 'ID transaksi tidak ditemukan di log.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. PENANGANAN SIMPAN BATCH ATAU SINGLE SUBMISSION
    const listToSave = data.submissions || (data.id || data.nominalPengajuan ? [data] : []);
    const existingValues = sheet.getDataRange().getValues();
    const existingIdMap = {};
    for (let r = 1; r < existingValues.length; r++) {
      existingIdMap[existingValues[r][0]] = r + 1; // baris di spreadsheet (1-indexed)
    }

    for (let i = 0; i < listToSave.length; i++) {
      const item = listToSave[i];
      if (!item) continue;

      const id = item.id || 'SUB-' + new Date().getTime();
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
        // Update baris yang sudah ada
        sheet.getRange(existingIdMap[id], 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        // Tambahkan baris baru
        sheet.appendRow(rowValues);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: listToSave.length,
      message: 'Berhasil mencatat ' + listToSave.length + ' data ke tab LOG_PENGAJUAN_LPJ di Google Sheet!'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
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

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = inputUrl.trim();
    if (cleanUrl.includes("docs.google.com/spreadsheets")) {
      setTestStatus("error");
      setTestMessage("⚠️ Link yang dimasukkan adalah URL Spreadsheet. Untuk Webhook, gunakan URL Web App Apps Script (berakhiran /exec). Lihat langkah 4 di bawah.");
      return;
    }
    onSaveWebAppUrl(cleanUrl);
    setTestStatus("idle");
    setTestMessage("URL Web App berhasil disimpan!");
  };

  const handleTestConnection = async () => {
    const url = inputUrl.trim();
    if (!url) {
      setTestStatus("error");
      setTestMessage("Masukkan URL Web App Apps Script terlebih dahulu.");
      return;
    }

    if (url.includes("docs.google.com/spreadsheets")) {
      setTestStatus("error");
      setTestMessage("⚠️ URL yang Anda masukkan adalah link Spreadsheet Google Sheet. Anda perlu menerapkan Web App dari menu Ekstensi -> Apps Script dan menggunakan URL yang berakhiran /exec.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Menguji koneksi ke Google Apps Script Web App...");

    try {
      const res = await fetch("/api/sync-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webAppUrl: url,
          action: "ping",
          submissions: []
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = {
          success: false,
          message: "Respon bukan format JSON. Pastikan Web App di-Deploy dengan hak akses 'Anyone' (Siapa saja)."
        };
      }

      if (data.success) {
        setTestStatus("success");
        setTestMessage("✅ Koneksi Berhasil! Google Apps Script siap mencatat pengajuan LPJ secara real-time.");
        onSaveWebAppUrl(url);
      } else {
        setTestStatus("error");
        setTestMessage(`⚠️ ${data.message || data.error || "Gagal menghubungi Apps Script"}`);
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
                Integrasi Otomatis Google Sheets & LPJ Lazuardi
              </h3>
              <p className="text-xs text-blue-100/90">
                Pencatatan Otomatis Real-time ke Tab <code>LOG_PENGAJUAN_LPJ</code> di Google Sheet
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
                onChange={(e) => setInputUrl(e.target.value)}
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
                Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &rarr; <strong>Deployment Baru (New deployment)</strong> &rarr; Pilih jenis: <strong>Aplikasi Web (Web app)</strong>.
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-1.5 text-[11px] text-amber-950 font-medium">
                  • <strong>Jalankan sebagai (Execute as):</strong> <em>Saya (email Anda)</em><br />
                  • <strong>Siapa yang memiliki akses (Who has access):</strong> <em>Siapa saja (Anyone)</em>
                </div>
              </li>
              <li>
                Salin <strong>URL Aplikasi Web (Web App URL)</strong> yang berakhiran <code>/exec</code>, lalu tempelkan ke kolom URL di atas dan klik <strong>Simpan URL</strong>.
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
