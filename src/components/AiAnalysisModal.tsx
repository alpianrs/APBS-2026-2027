import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Bot,
  Send,
  MessageSquare,
  FileText,
  HelpCircle,
  Search,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { ApbsSummaryData, ApbsRecapItem } from "../types";

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ApbsSummaryData;
  recapItems: ApbsRecapItem[];
  currentMonthName: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  summary,
  recapItems,
  currentMonthName
}) => {
  const [activeTab, setActiveTab] = useState<"report" | "chat">("report");

  // Executive Report state
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportText, setReportText] = useState<string>("");
  const [reportError, setReportError] = useState<string>("");
  const [reportCopied, setReportCopied] = useState<boolean>(false);

  // Interactive Chat state
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      text: `Halo! Saya Asisten Pintar APBS Lazuardi. 🤖\n\nAnda dapat menanyakan apa saja mengenai anggaran APBS, seperti:\n• "Apa yang harus saya ajukan terlebih dahulu bulan ini?"\n• "Cari kode APBS (#Rek) untuk pembelian alat tulis / ATK"\n• "Mana saja item yang masih keterlambatan LPJ?"\n\nSilakan pilih pertanyaan cepat di bawah atau ketik pertanyaan Anda!`,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Prepare samples for context
  const overdueItems = recapItems
    .filter((r) => r.isOverdue)
    .map((r) => ({
      rek: r.item.rek,
      name: r.item.name,
      unit: r.item.unit,
      targetApbsTotal: r.targetApbsTotal,
      isOverdue: true
    }));

  const sampleItemsForContext = recapItems.slice(0, 100).map((r) => ({
    rek: r.item.rek,
    name: r.item.name,
    unit: r.item.unit,
    targetApbsTotal: r.targetApbsTotal,
    isOverdue: r.isOverdue,
    hasSubmission: r.submissionsForMonth.some((s) => s.nominalPengajuan > 0)
  }));

  const overBudgetItems = recapItems
    .filter((r) => r.isOverBudget)
    .map((r) => ({
      rek: r.item.rek,
      name: r.item.name,
      unit: r.item.unit,
      target: r.targetApbsTotal,
      realisasi: r.totalRealisasi
    }));

  // Fetch Executive Report
  const fetchExecutiveReport = async () => {
    setReportLoading(true);
    setReportError("");
    try {
      const response = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryData: summary,
          overdueItems,
          overBudgetItems,
          currentMonthName
        })
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        const rawText = await response.text();
        console.warn("AI Analyze Non-JSON Response:", rawText.slice(0, 150));
        throw new Error(
          !response.ok 
            ? `Server Error (${response.status}) saat analisis AI.` 
            : "Respon server AI tidak berformat JSON."
        );
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal membuat laporan AI");
      }

      setReportText(data.analysis);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || "Gagal terhubung ke layanan Gemini AI");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !reportText && !reportLoading) {
      fetchExecutiveReport();
    }
  }, [isOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  // Handle Copy Report
  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportText);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  };

  // Handle Send Chat Question
  const handleSendChat = async (queryText?: string) => {
    const textToSend = (queryText || userPrompt).trim();
    if (!textToSend || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setUserPrompt("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: textToSend,
          chatHistory: chatMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          summaryData: summary,
          sampleItems: sampleItemsForContext,
          currentMonthName
        })
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        const rawText = await response.text();
        console.warn("AI Chat Non-JSON Response:", rawText.slice(0, 150));
        throw new Error(
          !response.ok 
            ? `Server Error (${response.status}) saat memproses chat.` 
            : "Respon server AI tidak berformat JSON."
        );
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal memperoleh balasan Gemini AI");
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: data.reply,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: `Mohon maaf, terjadi kendala saat memproses pertanyaan Anda: ${err.message || "Koneksi terputus"}. Silakan coba lagi.`,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const suggestedQuestions = [
    "📌 Item apa yang harus saya ajukan terlebih dahulu bulan ini?",
    "🔍 Cari kode APBS (#Rek) untuk kegiatan atau operasional",
    "⚠️ Mana saja pengajuan yang terlambat atau tunggakan LPJ?",
    "💰 Berapa sisa total anggaran APBS Lazuardi saat ini?"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2C59] via-[#1E3A8A] to-[#1E40AF] px-6 py-4 text-white border-b-2 border-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center">
                Analisis & Asisten AI APBS Lazuardi
                <span className="ml-2 text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-blue-200/90">
                Tanya-jawab interaktif & laporan eksekutif kesehatan APBS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center border-b-2 ${
              activeTab === "report"
                ? "bg-white text-[#0F2C59] border-amber-500 shadow-xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
            }`}
          >
            <FileText className="w-4 h-4 mr-1.5 text-amber-600" />
            <span>📊 Laporan Eksekutif AI</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center border-b-2 ${
              activeTab === "chat"
                ? "bg-white text-[#0F2C59] border-amber-500 shadow-xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-1.5 text-blue-600" />
            <span>💬 Tanya Jawab AI Interaktif</span>
            <span className="ml-1.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-extrabold">
              Baru
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          
          {/* TAB 1: EXECUTIVE REPORT */}
          {activeTab === "report" && (
            <div className="space-y-4">
              {reportLoading ? (
                <div className="py-14 flex flex-col items-center justify-center space-y-3 text-center">
                  <RefreshCw className="w-9 h-9 text-amber-500 animate-spin" />
                  <p className="text-sm font-extrabold text-[#0F2C59]">
                    Gemini AI sedang menyusun laporan eksekutif APBS Lazuardi...
                  </p>
                  <p className="text-xs text-slate-500 max-w-md">
                    Mengevaluasi {recapItems.length} item anggaran, status pengajuan bulanan, dan daya serap realisasi LPJ.
                  </p>
                </div>
              ) : reportError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
                  <p className="font-bold text-sm">Gagal Menggenerasi Laporan AI</p>
                  <p className="text-xs">{reportError}</p>
                  <button
                    onClick={fetchExecutiveReport}
                    className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-amber-600" />
                      <span className="font-bold text-xs">
                        Laporan Dihasilkan Otomatis Berdasarkan Data APBS Bulan {currentMonthName}
                      </span>
                    </div>
                    <button
                      onClick={fetchExecutiveReport}
                      className="text-amber-800 hover:text-amber-950 font-bold flex items-center hover:underline text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                    </button>
                  </div>

                  <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-xs bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-2xs">
                    {reportText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE CHATBOT */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-[52vh] justify-between space-y-3">
              
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs ${
                        msg.role === "user"
                          ? "bg-[#0F2C59] text-white rounded-tr-xs"
                          : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 border-b pb-1 border-white/10">
                        <span className="font-bold text-[11px] flex items-center">
                          {msg.role === "user" ? (
                            "Anda"
                          ) : (
                            <>
                              <Bot className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Asisten AI APBS
                            </>
                          )}
                        </span>
                        <span className="text-[10px] opacity-70 ml-2">{msg.time}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl p-3.5 text-slate-700 flex items-center space-x-2 border border-slate-200">
                      <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                      <span className="font-bold text-xs text-[#0F2C59]">
                        Gemini AI sedang mengetik jawaban...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 shrink-0">
                <span className="text-[11px] font-bold text-slate-500 flex items-center">
                  <HelpCircle className="w-3 h-3 mr-1 text-amber-600" />
                  Pertanyaan Cepat (Klik untuk bertanya):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(q)}
                      disabled={chatLoading}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-medium text-[11px] text-left transition-colors flex items-center disabled:opacity-50"
                    >
                      <span className="truncate max-w-[280px]">{q}</span>
                      <ChevronRight className="w-3 h-3 ml-1 text-amber-700 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center space-x-2 pt-1 shrink-0"
              >
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Ketik pertanyaan Anda (misal: 'Kode APBS untuk renovasi TK...')"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-400 focus:border-[#0F2C59] focus:outline-none"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !userPrompt.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#0F2C59] hover:bg-[#1E3A8A] text-white font-extrabold text-xs flex items-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  <span>Kirim</span>
                </button>
              </form>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-[11px] font-medium">
            Powered by Google Gemini 3.6 Flash &bull; Lazuardi APBS Assistant
          </span>

          <div className="flex space-x-2">
            {activeTab === "report" && (
              <button
                onClick={handleCopyReport}
                disabled={!reportText || reportLoading}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 flex items-center shadow-2xs"
              >
                {reportCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    <span>Salin Laporan</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
