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
import { ApbsCharts } from "./components/ApbsCharts";
import { ExportPrintReport } from "./components/ExportPrintReport";
import { SheetIdModal } from "./components/SheetIdModal";

import { ApbsItem, ApbsSubmission, ApbsStatusType, ApbsRecapItem } from "./types";
import { calculateApbsRecap, computeApbsSummary } from "./lib/apbsCalculations";
import { LAZUARDI_MONTHS, getCurrentSchoolMonth, getMonthInfo } from "./lib/constants";
import { INITIAL_SUBMISSIONS_SAMPLE } from "./lib/initialSubmissions";
import { RefreshCw, AlertCircle, Settings } from "lucide-react";

const STORAGE_KEY_SUBMISSIONS = "lazuardi_apbs_submissions_v1";
const DEFAULT_SHEET_ID = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTJVTzm62WYEDOahWZz0-6hvMDxS87MtDVsk2Hd4tFMfI8FWnZcK6eW3yYqa9iprImukVV11-T6p5ry/pub?output=csv";

export default function App() {
  const [sheetId, setSheetId] = useState<string>(() => {
    try {
      return localStorage.getItem("lazuardi_apbs_sheet_id") || DEFAULT_SHEET_ID;
    } catch {
      return DEFAULT_SHEET_ID;
    }
  });

  const [items, setItems] = useState<ApbsItem[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSheetIdModalOpen, setIsSheetIdModalOpen] = useState<boolean>(false);

  // Submissions state (stored in localStorage, clean default)
  const [submissions, setSubmissions] = useState<ApbsSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If saved data is just the dummy initial sample, reset to []
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
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pendingDeleteSubId, setPendingDeleteSubId] = useState<string | null>(null);

  // Save submissions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
    } catch (e) {
      console.error("Failed saving submissions to localStorage:", e);
    }
  }, [submissions]);

  // Fetch Google Sheet data from server endpoint
  const fetchSheetData = async () => {
    setIsRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/apbs-data?sheetId=${encodeURIComponent(sheetId)}`);
      
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Gagal memuat data (HTTP ${res.status}).`);
        }
        setItems(data.items || []);
        setUnits(data.units || []);
      } else {
        const rawText = await res.text();
        console.warn("APBS Data Endpoint Non-JSON Response:", rawText.slice(0, 150));
        throw new Error(`Gagal memuat data (HTTP ${res.status}). Server mengembalikan respon non-JSON.`);
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
  };

  const handleDeleteSubmission = (subId: string) => {
    setPendingDeleteSubId(subId);
    setIsPinModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteSubId) {
      setSubmissions((prev) => prev.filter((s) => s.id !== pendingDeleteSubId));

      // Trigger deletion endpoint to log & sync with Google Sheets
      fetch("/api/delete-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subId: pendingDeleteSubId, pin: "123" })
      }).catch((err) => console.error("Error calling delete endpoint:", err));

      setPendingDeleteSubId(null);
    }
  };

  const handleSaveSubmission = (
    submissionData: Omit<ApbsSubmission, "id"> & { id?: string }
  ) => {
    if (submissionData.id) {
      // Update existing
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionData.id ? { ...s, ...submissionData } : s
        )
      );
    } else {
      // Create new
      const newSub: ApbsSubmission = {
        ...submissionData,
        id: `sub-${Date.now()}`
      };
      setSubmissions((prev) => [newSub, ...prev]);
    }
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
        activeMonthNum={activeMonthNum}
        onChangeActiveMonth={(m) => setActiveMonthNum(m)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm my-8 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-10 h-10 text-emerald-700 animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Membaca & Memproses Data Google Sheet APBS Lazuardi...
              </h3>
              <p className="text-xs text-slate-500">
                Menghubungkan ke Spreadsheet: {sheetId.slice(0, 20)}...
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
                  onClick={() => setIsSheetIdModalOpen(true)}
                  className="px-3 py-1 bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all shadow-2xs"
                >
                  Ganti Link / ID Sheet
                </button>
              </h3>

              <div className="text-xs whitespace-pre-line leading-relaxed text-rose-900 font-medium bg-white/70 p-3.5 rounded-xl border border-rose-200/80">
                {error}
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={fetchSheetData}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Coba Sinkronisasi Ulang
                </button>
                <button
                  onClick={() => setIsSheetIdModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 text-amber-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Panduan & Masukkan URL Sheet
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Metrics Cards */}
            <MetricsCards
              summary={summaryMetrics}
              activeMonthName={activeMonthInfo.name}
            />

            {/* Overdue / Due Reminders */}
            <MonthlyReminderBanner
              overdueItems={overdueItems}
              dueThisMonthItems={dueThisMonthItems}
              currentMonthName={activeMonthInfo.name}
              onOpenSubmissionForItem={handleOpenSubmissionForItem}
            />

            {/* Visual Charts Toggle Area */}
            {showCharts && <ApbsCharts recapItems={filteredRecapItems} />}

            {/* Filter & Search Bar */}
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
              totalResults={filteredRecapItems.length}
              onResetFilters={handleResetFilters}
            />

            {/* Primary Rekap APBS Table */}
            <ApbsTable
              recapItems={filteredRecapItems}
              onOpenSubmissionForItem={handleOpenSubmissionForItem}
              onOpenReportModal={handleOpenReportModal}
              onOpenPurchaseDetailModal={handleOpenPurchaseDetailModal}
              onEditSubmission={handleEditSubmission}
              onDeleteSubmission={handleDeleteSubmission}
            />
          </>
        )}

      </main>

      {/* Submission Modal */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
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
