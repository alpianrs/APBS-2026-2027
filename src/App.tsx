import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { MetricsCards } from "./components/MetricsCards";
import { MonthlyReminderBanner } from "./components/MonthlyReminderBanner";
import { FilterBar } from "./components/FilterBar";
import { ApbsTable } from "./components/ApbsTable";
import { SubmissionModal } from "./components/SubmissionModal";
import { ReportModal } from "./components/ReportModal";
import { PurchaseItemsDetailModal } from "./components/PurchaseItemsDetailModal";
import { AppsScriptModal } from "./components/AppsScriptModal";
import { PinModal } from "./components/PinModal";
import { SubmissionHistoryModal } from "./components/SubmissionHistoryModal";
import { ApbsCharts } from "./components/ApbsCharts";
import { ExportPrintReport } from "./components/ExportPrintReport";
import { SheetIdModal } from "./components/SheetIdModal";
import { LazuardiLogo } from "./components/LazuardiLogo";

import { ApbsItem, ApbsSubmission, ApbsStatusType, ApbsRecapItem } from "./types";
import { calculateApbsRecap, computeApbsSummary } from "./lib/apbsCalculations";
import { LAZUARDI_MONTHS, getCurrentSchoolMonth, getMonthInfo } from "./lib/constants";
import { fetchDirectCsvData } from "./lib/sheetParser";
import { executeAppsScriptSync } from "./lib/syncService";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  ExternalLink,
  FileCode
} from "lucide-react";

const STORAGE_KEY_SUBMISSIONS = "lazuardi_apbs_submissions_v1";
const STORAGE_KEY_WEBHOOK = "lazuardi_apbs_apps_script_url";
const DEFAULT_SHEET_ID = "1Eg8UBRpKMufAtvl6EZqDSvlIFFhVc--EZFzCHHHRn8M";

export default function App() {
  const [sheetId, setSheetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("lazuardi_apbs_sheet_id");
      if (!saved || saved.includes("2PACX-1vTJVTzm62WYEDOahWZz0-6hvMDxS87MtDVsk2Hd4tFMfI8FWnZcK6eW3yYqa9iprImukVV11-T6p5ry")) {
        localStorage.setItem("lazuardi_apbs_sheet_id", DEFAULT_SHEET_ID);
        return DEFAULT_SHEET_ID;
      }
      return saved;
    } catch {
      return DEFAULT_SHEET_ID;
    }
  });

  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_WEBHOOK) || "";
    } catch {
      return "";
    }
  });

  const [items, setItems] = useState<ApbsItem[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSheetIdModalOpen, setIsSheetIdModalOpen] = useState<boolean>(false);

  // Sync notification toast state
  const [syncToast, setSyncToast] = useState<{
    type: "success" | "warn" | "error";
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const showToast = (
    type: "success" | "warn" | "error",
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setSyncToast({ type, message, actionLabel, onAction });
    setTimeout(() => {
      setSyncToast((current) => (current?.message === message ? null : current));
    }, 7000);
  };

  // Submissions state (stored in localStorage)
  const [submissions, setSubmissions] = useState<ApbsSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((s: any) => s.id === "sub-1" || s.id === "sub-2")) {
          localStorage.removeItem(STORAGE_KEY_SUBMISSIONS);
          return [];
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed loading saved submissions:", e);
    }
    return [];
  });

  // Filters & Month states
  const [activeMonthNum, setActiveMonthNum] = useState<number>(() => getCurrentSchoolMonth());
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | "ALL">("ALL");
  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<ApbsStatusType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // View Modals Toggles
  const [showCharts, setShowCharts] = useState<boolean>(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState<boolean>(false);
  const [preselectedRecapItem, setPreselectedRecapItem] = useState<ApbsRecapItem | null>(null);
  const [editSubmission, setEditSubmission] = useState<ApbsSubmission | null>(null);
  
  // LPJ Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ sub: ApbsSubmission; item: ApbsItem } | null>(null);

  // Purchase Details Modal state
  const [isPurchaseDetailModalOpen, setIsPurchaseDetailModalOpen] = useState<boolean>(false);
  const [purchaseDetailTarget, setPurchaseDetailTarget] = useState<{ sub: ApbsSubmission; item: ApbsItem } | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pendingDeleteSubId, setPendingDeleteSubId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Save submissions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
    } catch (e) {
      console.error("Failed saving submissions to localStorage:", e);
    }
  }, [submissions]);

  const handleSaveWebAppUrl = (url: string) => {
    setWebAppUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY_WEBHOOK, url);
    } catch {}
    if (url) {
      showToast("success", "✅ URL Webhook Google Apps Script berhasil disimpan & terhubung!");
    }
  };

  // Helper to sync single submission to Google Apps Script Web App
  const syncSubmissionToGoogleSheet = async (sub: ApbsSubmission, action: "save" | "delete" = "save") => {
    if (!webAppUrl) {
      showToast(
        "warn",
        "💾 Pengajuan tersimpan di aplikasi. Hubungkan URL Webhook Google Apps Script untuk otomatis mencatat ke Google Sheet.",
        "Sambungkan Sekarang",
        () => setIsAppsScriptModalOpen(true)
      );
      return;
    }

    const targetItem = items.find((it) => it.id === sub.itemId);
    const payload = {
      webAppUrl,
      action,
      id: sub.id,
      tanggalPengajuan: sub.tanggalPengajuan,
      monthNum: sub.monthNum,
      rek: targetItem?.rek || "-",
      itemName: targetItem?.name || "-",
      nominalPengajuan: sub.nominalPengajuan,
      nominalRealisasi: sub.nominalRealisasi,
      isReported: sub.isReported || sub.nominalRealisasi > 0,
      noSpkOrKwitansi: sub.noSpkOrKwitansi || "-",
      purchaseItems: sub.purchaseItems || [],
      catatan: sub.catatan || sub.submittedBy || "-"
    };

    try {
      const data = await executeAppsScriptSync(payload);

      if (data.success) {
        showToast("success", "✅ Pengajuan berhasil dicatat ke tab LOG_PENGAJUAN_LPJ di Google Sheet!");
      } else {
        showToast("error", `⚠️ Respon Google Apps Script: ${data.message || "Gagal sinkron"}`);
      }
    } catch (err: any) {
      console.warn("Sync submission error:", err);
    }
  };

  // Helper to sync all local submissions to Google Apps Script Web App in one click
  const handleSyncAllSubmissions = async () => {
    if (!webAppUrl) {
      showToast(
        "warn",
        "Masukkan URL Web App Google Apps Script terlebih dahulu untuk memulai sinkronisasi.",
        "Buka Pengaturan Apps Script",
        () => setIsAppsScriptModalOpen(true)
      );
      return;
    }

    setIsSyncingAll(true);
    try {
      const preparedList = submissions.map((sub) => {
        const targetItem = items.find((it) => it.id === sub.itemId);
        return {
          id: sub.id,
          tanggalPengajuan: sub.tanggalPengajuan,
          monthNum: sub.monthNum,
          rek: targetItem?.rek || "-",
          itemName: targetItem?.name || "-",
          nominalPengajuan: sub.nominalPengajuan,
          nominalRealisasi: sub.nominalRealisasi,
          isReported: sub.isReported || sub.nominalRealisasi > 0,
          noSpkOrKwitansi: sub.noSpkOrKwitansi || "-",
          purchaseItems: sub.purchaseItems || [],
          catatan: sub.catatan || sub.submittedBy || "-"
        };
      });

      const data = await executeAppsScriptSync({
        webAppUrl,
        action: "sync-all",
        submissions: preparedList
      });

      if (data.success) {
        showToast(
          "success",
          `✅ Berhasil! Sebanyak ${submissions.length} data pengajuan telah dicatat ke tab LOG_PENGAJUAN_LPJ di Google Sheet!`
        );
      } else {
        showToast("error", `⚠️ Gagal sinkronisasi: ${data.message || "Periksa Web App URL"}`);
      }
    } catch (err: any) {
      showToast("error", `❌ Error sinkronisasi: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Fetch Google Sheet data and remote LPJ tab data
  const fetchSheetData = async () => {
    setIsRefreshing(true);
    setError("");
    try {
      let loadedFromApi = false;
      let loadedItems: ApbsItem[] = [];

      try {
        const res = await fetch(`/api/apbs-data?sheetId=${encodeURIComponent(sheetId)}`);
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success) {
            loadedItems = data.items || [];
            setItems(loadedItems);
            setUnits(data.units || []);
            loadedFromApi = true;
          }
        }
      } catch (apiErr) {
        console.warn("API proxy fetch error, switching to direct CSV fallback:", apiErr);
      }

      if (!loadedFromApi) {
        const data = await fetchDirectCsvData(sheetId);
        loadedItems = data.items || [];
        setItems(loadedItems);
        setUnits(data.units || []);
      }

      // Also fetch remote submissions from LOG_PENGAJUAN_LPJ tab (gid=1399834495)
      try {
        const lpjRes = await fetch(`/api/lpj-data?sheetId=${encodeURIComponent(sheetId)}&gid=1399834495`);
        if (lpjRes.ok) {
          const lpjData = await lpjRes.json();
          if (lpjData.success && Array.isArray(lpjData.submissions) && lpjData.submissions.length > 0) {
            setSubmissions((prev) => {
              const map = new Map<string, ApbsSubmission>();
              lpjData.submissions.forEach((remoteSub: ApbsSubmission) => {
                // If item matches
                if (loadedItems.length > 0) {
                  const match = loadedItems.find((it) => it.id === remoteSub.itemId);
                  if (match) remoteSub.itemId = match.id;
                }
                map.set(remoteSub.id, remoteSub);
              });
              // Merge local items that are not yet on remote
              prev.forEach((localSub) => {
                if (!map.has(localSub.id)) {
                  map.set(localSub.id, localSub);
                }
              });
              return Array.from(map.values());
            });
          }
        }
      } catch (lpjErr) {
        console.warn("Could not fetch remote LPJ log tab:", lpjErr);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal terhubung ke Google Sheet");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [sheetId]);

  // Recalculate APBS Recap for all items
  const allRecapItems = useMemo(() => {
    return calculateApbsRecap(
      items,
      submissions,
      activeMonthNum,
      selectedMonthFilter
    );
  }, [items, submissions, activeMonthNum, selectedMonthFilter]);

  // Filter recap items based on user search & filter selections
  const filteredRecapItems = useMemo(() => {
    return allRecapItems.filter((r) => {
      // Search query filter (Kolom G Deskripsi Nama Item)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.item.name.toLowerCase().includes(q);
        const matchUnit = r.item.unit.toLowerCase().includes(q);
        const matchCategory = r.item.category.toLowerCase().includes(q);
        if (!matchName && !matchUnit && !matchCategory) return false;
      }

      // Unit filter
      if (selectedUnit !== "ALL" && r.item.unit !== selectedUnit) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [allRecapItems, searchQuery, selectedUnit, selectedStatus]);

  // Compute summary metrics
  const summaryMetrics = useMemo(() => {
    return computeApbsSummary(filteredRecapItems);
  }, [filteredRecapItems]);

  // Filter urgent overdue & due items for reminder banner
  const overdueItems = useMemo(() => {
    return allRecapItems.filter((r) => r.isOverdue);
  }, [allRecapItems]);

  const dueThisMonthItems = useMemo(() => {
    return allRecapItems.filter((r) => r.isDueThisMonth && r.totalPengajuan === 0);
  }, [allRecapItems]);

  // Handlers
  const handleOpenNewSubmission = () => {
    setPreselectedRecapItem(null);
    setEditSubmission(null);
    setIsSubmissionModalOpen(true);
  };

  const handleOpenSubmissionForItem = (recap: ApbsRecapItem) => {
    setPreselectedRecapItem(recap);
    setEditSubmission(null);
    setIsSubmissionModalOpen(true);
  };

  const handleEditSubmission = (sub: ApbsSubmission) => {
    setEditSubmission(sub);
    setPreselectedRecapItem(null);
    setIsSubmissionModalOpen(true);
  };

  const handleOpenReportModal = (sub: ApbsSubmission, item: ApbsItem) => {
    setReportTarget({ sub, item });
    setIsReportModalOpen(true);
  };

  const handleOpenPurchaseDetailModal = (sub: ApbsSubmission, item: ApbsItem) => {
    setPurchaseDetailTarget({ sub, item });
    setIsPurchaseDetailModalOpen(true);
  };

  const handleSaveReport = (updatedSub: ApbsSubmission) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
    );
    // Real-time sync update to Google Sheet
    syncSubmissionToGoogleSheet(updatedSub, "save");
  };

  const handleDeleteSubmission = (subId: string) => {
    setPendingDeleteSubId(subId);
    setIsPinModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteSubId) {
      const deletedId = pendingDeleteSubId;
      setSubmissions((prev) => prev.filter((s) => s.id !== deletedId));

      // Trigger deletion via universal sync service
      if (webAppUrl) {
        executeAppsScriptSync({
          webAppUrl,
          action: "delete",
          subId: deletedId,
          pin: "123"
        }).catch((err) => console.error("Error calling delete sync:", err));
      }

      showToast("success", "🗑️ Pengajuan berhasil dihapus dari sistem & disinkronkan.");
      setPendingDeleteSubId(null);
    }
  };

  const handleSaveSubmission = (
    submissionData: Omit<ApbsSubmission, "id"> & { id?: string }
  ) => {
    let savedSub: ApbsSubmission;

    if (submissionData.id) {
      // Update existing
      savedSub = { ...submissionData, id: submissionData.id } as ApbsSubmission;
      setSubmissions((prev) =>
        prev.map((s) => (s.id === savedSub.id ? savedSub : s))
      );
    } else {
      // Create new
      savedSub = {
        ...submissionData,
        id: `sub-${Date.now()}`
      };
      setSubmissions((prev) => [savedSub, ...prev]);
    }

    // Immediately sync to Google Sheets via Webhook
    syncSubmissionToGoogleSheet(savedSub, "save");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedMonthFilter("ALL");
    setSelectedUnit("ALL");
    setSelectedStatus("ALL");
  };

  const activeMonthInfo = getMonthInfo(activeMonthNum);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased pb-12">
      
      {/* Header Bar */}
      <Header
        sheetId={sheetId}
        isRefreshing={isRefreshing}
        onRefresh={fetchSheetData}
        onOpenSheetIdModal={() => setIsSheetIdModalOpen(true)}
        onOpenNewSubmission={handleOpenNewSubmission}
        onToggleCharts={() => setShowCharts(!showCharts)}
        showCharts={showCharts}
        onOpenPrintReport={() => setIsPrintModalOpen(true)}
        onOpenAppsScript={() => setIsAppsScriptModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        submissionCount={submissions.length}
        activeMonthNum={activeMonthNum}
        onChangeActiveMonth={(m) => setActiveMonthNum(m)}
        webAppUrl={webAppUrl}
      />

      {/* Floating Sync Toast Notification Banner */}
      {syncToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md w-full animate-in slide-in-from-top duration-300">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-start space-x-3 backdrop-blur-md ${
            syncToast.type === "success"
              ? "bg-emerald-950/90 text-emerald-100 border-emerald-500"
              : syncToast.type === "warn"
              ? "bg-[#0A1C3E]/95 text-amber-200 border-amber-400"
              : "bg-rose-950/90 text-rose-100 border-rose-500"
          }`}>
            {syncToast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : syncToast.type === "warn" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 text-xs space-y-2">
              <p className="font-semibold leading-relaxed">{syncToast.message}</p>
              {syncToast.actionLabel && syncToast.onAction && (
                <button
                  onClick={() => {
                    syncToast.onAction?.();
                    setSyncToast(null);
                  }}
                  className="px-3 py-1 bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] shadow hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  {syncToast.actionLabel}
                </button>
              )}
            </div>

            <button
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm my-8 flex flex-col items-center justify-center space-y-4">
            <LazuardiLogo variant="shield" size="xl" />
            <div className="flex items-center space-x-2 text-[#1855C6]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-bold text-sm">Menghubungkan ke Spreadsheet Google Sheet...</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-800">
                Memproses Data APBS Lazuardi
              </h3>
              <p className="text-xs text-slate-500">
                Spreadsheet ID: {sheetId.slice(0, 25)}...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-6 my-8 text-rose-900 flex items-start space-x-3.5 shadow-xs">
            <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-3 w-full">
              <h3 className="font-bold text-sm text-rose-950 flex items-center justify-between">
                <span>Gagal Mengambil Data Google Sheet APBS</span>
                <button
                  onClick={fetchSheetData}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Coba Lagi
                </button>
              </h3>
              <p className="text-xs text-rose-800 whitespace-pre-line leading-relaxed font-mono bg-rose-100/70 p-3 rounded-xl border border-rose-200">
                {error}
              </p>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => setIsSheetIdModalOpen(true)}
                  className="px-4 py-2 bg-[#0F2C59] hover:bg-[#1E3A8A] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Ganti Link Google Sheet
                </button>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Buka di Google Sheets
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Reminder Banner for Overdue / Due APBS Items */}
            <MonthlyReminderBanner
              activeMonthNum={activeMonthNum}
              overdueItems={overdueItems}
              dueThisMonthItems={dueThisMonthItems}
              onOpenSubmissionForItem={handleOpenSubmissionForItem}
            />

            {/* Top Summary Metrics Cards */}
            <MetricsCards
              summary={summaryMetrics}
              activeMonthName={activeMonthInfo.name}
            />

            {/* Optional Visual Analysis Charts */}
            {showCharts && (
              <ApbsCharts
                recapItems={allRecapItems}
                activeMonthNum={activeMonthNum}
              />
            )}

            {/* Filter and Search Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedMonth={selectedMonthFilter}
              onMonthChange={setSelectedMonthFilter}
              selectedUnit={selectedUnit}
              onUnitChange={setSelectedUnit}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              units={units}
              onResetFilters={handleResetFilters}
              totalFilteredCount={filteredRecapItems.length}
              totalAllCount={items.length}
            />

            {/* Main Interactive Table */}
            <ApbsTable
              recapItems={filteredRecapItems}
              activeMonthNum={activeMonthNum}
              selectedMonthFilter={selectedMonthFilter}
              onOpenSubmissionForItem={handleOpenSubmissionForItem}
              onEditSubmission={handleEditSubmission}
              onOpenReportModal={handleOpenReportModal}
              onOpenPurchaseDetails={handleOpenPurchaseDetailModal}
              onDeleteSubmission={handleDeleteSubmission}
            />

          </div>
        )}

      </main>

      {/* Submission Modal (Pengajuan Baru / Edit) */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => {
          setIsSubmissionModalOpen(false);
          setEditSubmission(null);
          setPreselectedRecapItem(null);
        }}
        items={items}
        preselectedRecapItem={preselectedRecapItem}
        editSubmission={editSubmission}
        onSave={handleSaveSubmission}
        defaultMonthNum={activeMonthNum}
      />

      {/* Report Modal (Laporan LPJ & Realisasi) */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        submission={reportTarget?.sub || null}
        item={reportTarget?.item || null}
        onSaveReport={handleSaveReport}
      />

      {/* Purchase Items Breakdown Detail Modal */}
      <PurchaseItemsDetailModal
        isOpen={isPurchaseDetailModalOpen}
        onClose={() => setIsPurchaseDetailModalOpen(false)}
        submission={purchaseDetailTarget?.sub || null}
        item={purchaseDetailTarget?.item || null}
      />

      {/* Printable Report Modal */}
      <ExportPrintReport
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        recapItems={filteredRecapItems}
        summary={summaryMetrics}
        activeMonthName={activeMonthInfo.name}
      />

      {/* Google Apps Script Modal */}
      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
        sheetId={sheetId}
        submissions={submissions}
        items={items}
        webAppUrl={webAppUrl}
        onSaveWebAppUrl={handleSaveWebAppUrl}
        onSyncAll={handleSyncAllSubmissions}
        isSyncing={isSyncingAll}
      />

      {/* Submission History / Delete Manager Modal */}
      <SubmissionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        submissions={submissions}
        items={items}
        onEditSubmission={handleEditSubmission}
        onDeleteSubmission={handleDeleteSubmission}
        onOpenReportModal={handleOpenReportModal}
        onOpenPurchaseDetailModal={handleOpenPurchaseDetailModal}
      />

      {/* Pin Access Security Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingDeleteSubId(null);
        }}
        onSuccess={handleConfirmDelete}
        title="Otorisasi Akses PIN Pengurus"
        description="Masukkan PIN keamanan 123 untuk menghapus pengajuan APBS dari aplikasi dan Google Sheet."
      />

      {/* Google Spreadsheet URL/ID Modal */}
      <SheetIdModal
        isOpen={isSheetIdModalOpen}
        onClose={() => setIsSheetIdModalOpen(false)}
        currentSheetId={sheetId}
        onSaveSheetId={(newId) => {
          setSheetId(newId);
          try {
            localStorage.setItem("lazuardi_apbs_sheet_id", newId);
          } catch {}
        }}
        defaultSheetId={DEFAULT_SHEET_ID}
      />

    </div>
  );
}
