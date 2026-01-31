import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useSector, Sector } from "@/contexts/SectorContext";
import { useDomainSnapshot } from "@/hooks/useDomainSnapshot";
import { ChatSidebar } from "@/components/dashboard/ChatSidebar";
import { MobileChatSidebar } from "@/components/dashboard/MobileChatSidebar";
import { ChatView } from "@/components/dashboard/ChatView";
import { ChatInput } from "@/components/dashboard/ChatInput";
import { DomainSelector } from "@/components/dashboard/DomainSelector";
import { CreditDisplay } from "@/components/dashboard/CreditDisplay";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF, exportToExcel, exportToWord, exportFavoritesToPDF, exportFavoritesToExcel } from "@/utils/chatExport";

const Dashboard = () => {
  const { user } = useAuth();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    streamingContent,
    researchState,
    sendMessage,
    createNewConversation,
    selectConversation,
    toggleFavorite,
    deleteMessage,
    deleteConversation,
    cancelRequest,
  } = useConversations();
  const { currentSector, setSector, getSectorConfig, getDomainSystemPrompt } = useSector();
  const { content: domainSnapshot, loading: snapshotLoading, fetchSnapshot, clearSnapshot } = useDomainSnapshot();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sectorConfig = getSectorConfig();

  // Check for pre-filled prompt from domain page
  useEffect(() => {
    const domainPrompt = sessionStorage.getItem("domainPrompt");
    const domainContext = sessionStorage.getItem("domainContext");
    
    if (domainPrompt) {
      // Set domain context if provided
      if (domainContext && domainContext !== "all") {
        setSector(domainContext as Sector);
      }
      
      // Clear session storage first
      sessionStorage.removeItem("domainPrompt");
      sessionStorage.removeItem("domainContext");
      
      // Send the message after a brief delay to let state settle
      setTimeout(() => {
        handleSendMessage(domainPrompt, "quick");
      }, 100);
    }
  }, []);

  // Handle domain change - fetch snapshot for new domain
  const handleDomainChange = useCallback((sector: Sector) => {
    // Clear previous snapshot and fetch new one
    clearSnapshot();
    if (sector !== "all") {
      // Delay snapshot fetch slightly to let state settle
      setTimeout(() => {
        fetchSnapshot(sector);
      }, 100);
    }
  }, [clearSnapshot, fetchSnapshot]);

  const handleSendMessage = async (message: string, mode: "quick" | "deep" = "quick", model?: string) => {
    await sendMessage(message, mode, model, currentSector);
  };

  const handleExportPDF = () => {
    exportToPDF(currentConversation, messages);
  };

  const handleExportExcel = () => {
    exportToExcel(currentConversation, messages);
  };

  const handleExportWord = () => {
    exportToWord(currentConversation, messages);
  };

  const handleExportFavoritesPDF = () => {
    exportFavoritesToPDF(currentConversation, messages);
  };

  const handleExportFavoritesExcel = () => {
    exportFavoritesToExcel(currentConversation, messages);
  };

  const hasFavorites = messages.some((m) => m.is_favorite);

  return (
    <div className="min-h-screen bg-black flex w-full">
      {/* Desktop Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={selectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          sidebarOpen ? "lg:ml-72" : "lg:ml-14"
        )}
      >
        {/* Top Navigation */}
        <TopNavigation showSectorTabs={false} showCredits={true} />

        {/* Header Spacer */}
        <div className="h-14 lg:h-[72px]" />

        {/* Mobile Header */}
        <div className="lg:hidden border-b border-border/30 bg-black sticky top-14 z-30">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <MobileChatSidebar
              conversations={conversations}
              currentConversation={currentConversation}
              onSelectConversation={selectConversation}
              onNewConversation={createNewConversation}
              onDeleteConversation={deleteConversation}
            />
            <div className="flex-1">
              <DomainSelector variant="dropdown" onDomainChange={handleDomainChange} />
            </div>
            <CreditDisplay variant="compact" />
          </div>
        </div>

        {/* Desktop Domain Bar */}
        <div className="hidden lg:block border-b border-border/30 bg-black">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <DomainSelector variant="pills" className="flex-1" onDomainChange={handleDomainChange} />
            <div className="flex items-center gap-3">
              {/* Export Button */}
              {messages.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileDown className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportWord}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as Word
                    </DropdownMenuItem>
                    {hasFavorites && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportFavoritesPDF}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export Favorites (PDF)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportFavoritesExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export Favorites (CSV)
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <CreditDisplay variant="compact" />
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          {/* Grainy transition overlay for All Domains view */}
          {currentSector === "all" && (
            <div className="gradient-grain-transition absolute inset-0 pointer-events-none" />
          )}
          <ChatView
            messages={messages}
            streamingContent={streamingContent}
            isLoading={loading}
            researchState={researchState}
            onToggleFavorite={toggleFavorite}
            onDeleteMessage={deleteMessage}
            onNewChat={createNewConversation}
            onSelectPrompt={(prompt) => handleSendMessage(prompt, "quick")}
            onFollowUpClick={(question) => handleSendMessage(question, "quick")}
            domainSnapshot={domainSnapshot}
            domainSnapshotLoading={snapshotLoading}
          />

          {/* Input Area - hide when All Domains */}
          {currentSector !== "all" && (
            <div className="border-t border-border/30 bg-black p-4 sticky bottom-0">
              <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 animate-fade-in">
                <ChatInput
                  onSubmit={handleSendMessage}
                  isLoading={loading}
                  placeholder={sectorConfig.placeholder}
                  onCancel={cancelRequest}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
