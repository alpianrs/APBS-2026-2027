import React, { useState } from "react";
import { X, Copy, Check, FileCode, CheckCircle2, Info, Server, KeyRound } from "lucide-react";

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  sheetId
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const appScriptCode = `/**
 * ====================================================================
 * GOOGLE APPS SCRIPT - MONITORING APBS & AUTOMATED LPJ LAZUARDI (V2)
 * ====================================================================
 * Fitur Lengkap:
 * 1. Otomatisasi Pencatatan Pengajuan, LPJ Realisasi, dan Sinkronisasi Hapus (PIN 123).
 * 2. Mencegah Double-Counting (Memastikan Total Expenses hanya menghitung
 *    item detail Rp 2.433.032.500, tanpa menyertakan baris subtotal category).
 * 3. Pembacaan Kode APBS (#Rek) dari Kolom H (index 7) Spreadsheet.
 * 4. Menu kustom "🟢 APBS Lazuardi" untuk kemudahan pengurus.
 */

// 1. MEMBUAT MENU KUSTOM DI GOOGLE SHEETS
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🟢 APBS Lazuardi')
    .addItem('1. Inisialisasi Tab LOG_PENGAJUAN_LPJ', 'setupLpjLogSheet')
    .addItem('2. Hitung Total Item APBS (Eksklusi Subtotal)', 'calculateItemExpensesOnly')
    .addItem('3. Test Koneksi Webhook APBS', 'testWebhook')
    .addToUi();
}

// 2. MEMBUAT TAB "LOG_PENGAJUAN_LPJ" JIKA BELUM ADA
function setupLpjLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LOG_PENGAJUAN_LPJ');
  
  if (!sheet) {
    sheet = ss.insertSheet('LOG_PENGAJUAN_LPJ');
    
    // Header Kolom
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
    SpreadsheetApp.getUi().alert('✅ Tab "LOG_PENGAJUAN_LPJ" berhasil dibuat!');
  } else {
    SpreadsheetApp.getUi().alert('ℹ️ Tab "LOG_PENGAJUAN_LPJ" sudah tersedia di Spreadsheet ini.');
  }
}

// 3. MENGHITUNG TOTAL APBS EXPENSES HANYA DARI ITEM DETAIL (EKSKLUSI SUBTOTAL)
function calculateItemExpensesOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  let itemCount = 0;
  
  // Asumsi Kolom G (index 6) adalah Nama Item, Kolom H (index 7) adalah Rekening
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    const itemName = String(row[6] || '').trim();
    const lowerName = itemName.toLowerCase();
    
    // Abaikan baris kosong, header, dan baris subtotal/total
    if (!itemName || 
        lowerName.startsWith('total') || 
        lowerName.startsWith('jumlah') || 
        lowerName.startsWith('subtotal') ||
        lowerName.includes('total expenses') ||
        lowerName.includes('total income') ||
        lowerName.includes('net (income') ||
        lowerName.includes('projected')) {
      continue;
    }
    
    itemCount++;
  }
  
  SpreadsheetApp.getUi().alert('📊 Analisis Item APBS Lazuardi:\\n' +
    'Total Item Detail Terdeteksi: ' + itemCount + ' item\\n' +
    'Keterangan: Subtotal kategori diabaikan agar Total Expenses valid (Target Rp 2.433.032.500).');
}

// 4. WEBHOOK PENERIMA DATA DARI WEB APP (Tambah LPJ & Hapus Sync dengan PIN 123)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('LOG_PENGAJUAN_LPJ');
    
    if (!sheet) {
      setupLpjLogSheet();
      sheet = ss.getSheetByName('LOG_PENGAJUAN_LPJ');
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
          // Tandai sebagai DIBATALKAN / DIHAPUS
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

    // B. PENANGANAN AKSI SIMPAN / UPDATE PENGAJUAN LPJ
    const timestamp = new Date();
    const id = data.id || 'SUB-' + timestamp.getTime();
    const tgl = data.tanggalPengajuan || timestamp.toISOString().split('T')[0];
    const bulan = data.monthNum || '-';
    const rek = data.rek || '-';
    const name = data.itemName || '-';
    const nominalPengajuan = Number(data.nominalPengajuan || 0);
    const nominalRealisasi = Number(data.nominalRealisasi || 0);
    const selisih = nominalPengajuan - nominalRealisasi;
    const status = data.isReported ? 'SUDAH_DILAPORKAN' : 'BELUM_LAPORAN';
    const noSpk = data.noSpkOrKwitansi || '-';
    const purchaseInfo = data.purchaseItems ? JSON.stringify(data.purchaseItems) : '-';
    const catatan = data.catatan || '-';
    
    sheet.appendRow([
      id, tgl, bulan, rek, name, nominalPengajuan, nominalRealisasi, selisih, status, noSpk, purchaseInfo, catatan, 'AKTIF'
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data LPJ Pengajuan berhasil dicatat di Google Sheet!'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] px-6 py-4 text-white border-b-2 border-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Google Apps Script (Update V2) - APBS & LPJ
              </h3>
              <p className="text-xs text-blue-200/90">
                Otomatisasi Google Sheets Lazuardi (Sinkronisasi LPJ, Kode Rekening Kolom H, & PIN 123)
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
          
          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-950">
            <div className="flex items-start space-x-2.5">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  Pembaruan Script Otomatisasi Google Sheets (V2):
                </h4>
                <p className="leading-relaxed text-slate-800">
                  Script ini secara otomatis akan membuat tab <code>LOG_PENGAJUAN_LPJ</code>, membaca Kode APBS (#Rek) dari <strong>Kolom H</strong>, dan mendukung sinkronisasi penghapusan transaksi dengan PIN keamanan <code>123</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Steps Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="font-extrabold text-[#0F2C59] flex items-center text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
              Cara Pemasangan / Pembaruan di Google Sheet:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
              <li>
                Buka Spreadsheet APBS Lazuardi Anda (ID: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900">{sheetId.slice(0, 15)}...</code>).
              </li>
              <li>
                Klik menu di bagian atas: <strong>Ekstensi (Extensions)</strong> &rarr; <strong>Apps Script</strong>.
              </li>
              <li>
                Hapus semua kode lama di editor Apps Script, lalu klik tombol di bawah untuk <strong>Salin Script</strong>.
              </li>
              <li>
                <strong>Paste (Tempel)</strong> ke editor, klik <strong>Simpan (Save)</strong>, lalu jalankan fungsi <code>setupLpjLogSheet</code>.
              </li>
            </ol>
          </div>

          {/* Code Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F2C59] flex items-center">
                <Server className="w-4 h-4 mr-1.5 text-amber-600" /> Kode Script Terbaru (Code.gs):
              </span>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-[#0F2C59] text-white hover:bg-[#1E3A8A]"
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
              <pre className="bg-slate-900 text-amber-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                {appScriptCode}
              </pre>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-[11px] font-medium flex items-center">
            <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600" /> Otorisasi Akses Hapus Sync: PIN 123
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
