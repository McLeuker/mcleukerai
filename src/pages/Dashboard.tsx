import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, Conversation } from "@/hooks/useConversations";
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
    retryMessage,
    deleteConversation,
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

  const handleSendMessage = async (message: string, mode: "quick" | "deep" = "quick", _model?: string) => {
    await sendMessage(message, mode, currentSector);
  };

  // Adapter for ChatSidebar which expects (conversation: Conversation) => void
  const handleSelectConversation = (conversation: Conversation) => {
    selectConversation(conversation.id);
  };

  // No-op for delete message since we don't have that feature yet
  const handleDeleteMessage = (_messageId: string) => {
    // Not implemented - messages are kept for history
  };

  // Determine if we should show the bottom input
  // Hide it when on "All Domains" with no messages (DomainStarterPanel has its own input)
  const showBottomInput = !(currentSector === "all" && messages.length === 0);

  // Calculate sidebar width for fixed composer positioning
  const sidebarWidth = sidebarOpen ? 288 : 56; // 72 = 18rem, 56px = collapsed

  return (
    <div className="min-h-screen bg-[#070707] flex w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={deleteConversation}
        onNewConversation={createNewConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Unified Header via TopNavigation */}
        <TopNavigation 
          showSectorTabs={true} 
          showCredits={true} 
        />

        {/* Header Spacer - matches graphite glass nav */}
        <div className="h-14 lg:h-[72px] bg-gradient-to-b from-[#0D0D0D] to-[#0A0A0A]" />

        {/* Mobile Header */}
        <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-30">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <MobileChatSidebar
              conversations={conversations}
              currentConversation={currentConversation}
              onSelectConversation={handleSelectConversation}
              onNewConversation={createNewConversation}
              onDeleteConversation={deleteConversation}
            />
            <div className="flex-1">
              <DomainSelector variant="dropdown" onDomainChange={handleDomainChange} />
            </div>
            <CreditDisplay variant="compact" />
          </div>
        </div>

        {/* Chat Area - with padding for fixed composer */}
        <main className={cn(
          "flex-1 flex flex-col min-h-0 relative",
          sidebarOpen ? "lg:pl-72" : "lg:pl-14",
          showBottomInput && "pb-[120px]" // Space for fixed composer
        )}>
          {/* Grainy transition overlay for Global view */}
          {currentSector === "all" && (
            <div className="gradient-grain-transition absolute inset-0 pointer-events-none" />
          )}
          <ChatView
            messages={messages}
            streamingContent={streamingContent}
            isLoading={loading}
            researchState={researchState}
            onToggleFavorite={toggleFavorite}
            onDeleteMessage={handleDeleteMessage}
            onNewChat={createNewConversation}
            onSelectPrompt={(prompt, mode, model) => handleSendMessage(prompt, mode || "quick", model)}
            onFollowUpClick={(question) => handleSendMessage(question, "quick")}
            onRetry={retryMessage}
            domainSnapshot={domainSnapshot}
            domainSnapshotLoading={snapshotLoading}
          />
        </main>

        {/* Fixed Composer at bottom */}
        {showBottomInput && (
          <div 
            className={cn(
              "fixed bottom-0 right-0 z-40",
              "border-t border-white/[0.08] p-4",
              "bg-gradient-to-b from-[#0A0A0A] to-[#070707]"
            )}
            style={{
              left: `${sidebarWidth}px`,
              transition: 'left 200ms ease'
            }}
          >
            <div className="hidden lg:block" /> {/* Desktop spacer handled by style */}
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 animate-fade-in">
              <ChatInput
                onSubmit={handleSendMessage}
                isLoading={loading}
                placeholder={sectorConfig.placeholder}
              />
            </div>
          </div>
        )}
        
        {/* Mobile fixed composer */}
        {showBottomInput && (
          <div 
            className={cn(
              "lg:hidden fixed bottom-0 left-0 right-0 z-40",
              "border-t border-white/[0.08] p-4",
              "bg-gradient-to-b from-[#0A0A0A] to-[#070707]"
            )}
          >
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 animate-fade-in">
              <ChatInput
                onSubmit={handleSendMessage}
                isLoading={loading}
                placeholder={sectorConfig.placeholder}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;