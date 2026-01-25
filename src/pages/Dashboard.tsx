import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useSector } from "@/contexts/SectorContext";
import { ChatSidebar } from "@/components/dashboard/ChatSidebar";
import { MobileChatSidebar } from "@/components/dashboard/MobileChatSidebar";
import { ChatView } from "@/components/dashboard/ChatView";
import { ChatInput } from "@/components/dashboard/ChatInput";
import { DomainSelector } from "@/components/dashboard/DomainSelector";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { CreditDisplay } from "@/components/dashboard/CreditDisplay";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileDown, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF, exportToExcel, exportFavoritesToPDF, exportFavoritesToExcel } from "@/utils/chatExport";

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
  const { getSectorConfig } = useSector();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sectorConfig = getSectorConfig();

  const handleSendMessage = async (message: string, mode: "quick" | "deep" = "quick") => {
    await sendMessage(message, mode);
  };

  const handleExportPDF = () => {
    exportToPDF(currentConversation, messages);
  };

  const handleExportExcel = () => {
    exportToExcel(currentConversation, messages);
  };

  const handleExportFavoritesPDF = () => {
    exportFavoritesToPDF(currentConversation, messages);
  };

  const handleExportFavoritesExcel = () => {
    exportFavoritesToExcel(currentConversation, messages);
  };

  const hasFavorites = messages.some((m) => m.is_favorite);

  return (
    <div className="min-h-screen bg-background flex w-full">
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
        <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-30">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <MobileChatSidebar
              conversations={conversations}
              currentConversation={currentConversation}
              onSelectConversation={selectConversation}
              onNewConversation={createNewConversation}
              onDeleteConversation={deleteConversation}
            />
            <div className="flex-1">
              <DomainSelector variant="dropdown" />
            </div>
            <CreditDisplay variant="compact" />
          </div>
        </div>

        {/* Desktop Domain Bar */}
        <div className="hidden lg:block border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <DomainSelector variant="pills" className="flex-1" />
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
        <main className="flex-1 flex flex-col min-h-0">
          <ChatView
            messages={messages}
            streamingContent={streamingContent}
            isLoading={loading}
            researchState={researchState}
            onToggleFavorite={toggleFavorite}
            onDeleteMessage={deleteMessage}
            onNewChat={createNewConversation}
          />

          {/* Input Area */}
          <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4 lg:p-6 sticky bottom-0">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && !loading && (
                <QuickActions onAction={(msg) => handleSendMessage(msg, "quick")} isLoading={loading} />
              )}
              <ChatInput
                onSubmit={handleSendMessage}
                isLoading={loading}
                placeholder={sectorConfig.placeholder}
                onCancel={cancelRequest}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
