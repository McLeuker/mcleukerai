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
import { cn } from "@/lib/utils";

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
    retryMessage,
  } = useConversations();
  const { currentSector, setSector, getSectorConfig } = useSector();
  const { content: domainSnapshot, loading: snapshotLoading, fetchSnapshot, clearSnapshot } = useDomainSnapshot();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sectorConfig = getSectorConfig();

  // Check for pre-filled prompt from domain page
  useEffect(() => {
    const domainPrompt = sessionStorage.getItem("domainPrompt");
    const domainContext = sessionStorage.getItem("domainContext");
    
    if (domainPrompt) {
      if (domainContext && domainContext !== "all") {
        setSector(domainContext as Sector);
      }
      
      sessionStorage.removeItem("domainPrompt");
      sessionStorage.removeItem("domainContext");
      
      setTimeout(() => {
        handleSendMessage(domainPrompt, "quick");
      }, 100);
    }
  }, []);

  const handleDomainChange = useCallback((sector: Sector) => {
    clearSnapshot();
    if (sector !== "all") {
      setTimeout(() => {
        fetchSnapshot(sector);
      }, 100);
    }
  }, [clearSnapshot, fetchSnapshot]);

  const handleSendMessage = async (message: string, mode: "quick" | "deep" = "quick", model?: string) => {
    await sendMessage(message, mode, model, currentSector);
  };

  // Determine if we should show the bottom input
  // Hide it when on "All Domains" with no messages (DomainStarterPanel has its own input)
  const showBottomInput = !(currentSector === "all" && messages.length === 0);

  return (
    <div className="min-h-screen bg-black flex w-full">
      {/* Desktop Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Unified Header via TopNavigation */}
        <TopNavigation 
          showSectorTabs={true} 
          showCredits={true} 
          showNewChat={true} 
          onNewChat={createNewConversation} 
        />

        {/* Header Spacer */}
        <div className="h-14 lg:h-[72px] bg-black" />

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
              <DomainSelector variant="dropdown" onDomainChange={handleDomainChange} />
            </div>
            <CreditDisplay variant="compact" />
          </div>
        </div>

        {/* Chat Area */}
        <main className={cn(
          "flex-1 flex flex-col min-h-0 relative",
          sidebarOpen ? "lg:pl-64" : "lg:pl-14"
        )}>
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
            onSelectPrompt={(prompt, mode, model) => handleSendMessage(prompt, mode || "quick", model)}
            onFollowUpClick={(question) => handleSendMessage(question, "quick")}
            onRetry={retryMessage}
            domainSnapshot={domainSnapshot}
            domainSnapshotLoading={snapshotLoading}
          />

          {/* Input Area - conditionally shown */}
          {showBottomInput && (
            <div className="border-t border-white/10 bg-black p-4 sticky bottom-0">
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
