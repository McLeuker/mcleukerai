import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useSector, Sector } from "@/contexts/SectorContext";
import { useDomainSnapshot } from "@/hooks/useDomainSnapshot";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { ChatSidebar } from "@/components/dashboard/ChatSidebar";
import { MobileChatSidebar } from "@/components/dashboard/MobileChatSidebar";
import { ChatView } from "@/components/dashboard/ChatView";
import { ChatInput } from "@/components/dashboard/ChatInput";
import { DomainSelector } from "@/components/dashboard/DomainSelector";
import { CreditDisplay } from "@/components/dashboard/CreditDisplay";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FileDown, FileSpreadsheet, FileText, Plus, User, CreditCard, Settings, HelpCircle, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF, exportToExcel, exportToWord, exportFavoritesToPDF, exportFavoritesToExcel } from "@/utils/chatExport";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

interface UserProfile {
  name: string | null;
  profile_image: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
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
  const { currentSector, setSector, getSectorConfig } = useSector();
  const { content: domainSnapshot, loading: snapshotLoading, fetchSnapshot, clearSnapshot } = useDomainSnapshot();
  const { creditBalance, plan } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const sectorConfig = getSectorConfig();

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("users")
      .select("name, profile_image")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
    
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [fetchUserProfile]);

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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
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
        {/* Single Unified Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-sidebar h-14">
          <div className="h-full flex items-center px-4 lg:px-6">
            {/* Left: Logo + New Chat */}
            <div className="flex items-center gap-4 shrink-0">
              <Link to="/" className="flex items-center">
                <img src={mcleukerLogo} alt="McLeuker AI" className="h-8 w-auto" />
              </Link>
              <Button
                onClick={createNewConversation}
                className="hidden lg:flex px-3 py-1.5 h-auto rounded-full gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </Button>
            </div>

            {/* Center: Domain Pills */}
            <div className="hidden lg:flex flex-1 justify-center">
              <DomainSelector variant="pills" onDomainChange={handleDomainChange} />
            </div>

            {/* Right: Export + Credits + Profile */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Export Button - desktop only, when messages exist */}
              {messages.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden lg:flex gap-2 rounded-full text-xs">
                      <FileDown className="h-3.5 w-3.5" />
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

              {/* Credits */}
              <CreditDisplay variant="compact" />

              {/* Profile Avatar & Dropdown */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={userProfile?.profile_image || user.user_metadata?.avatar_url || user.user_metadata?.picture} />
                        <AvatarFallback className="text-xs bg-secondary">
                          {getInitials(userProfile?.name || null, user.email || "U")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2 border-b border-border">
                      {userProfile?.name && (
                        <p className="text-sm font-medium truncate">{userProfile.name}</p>
                      )}
                      <p className={cn("text-sm truncate", userProfile?.name ? "text-muted-foreground" : "font-medium")}>{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{plan} plan</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{creditBalance}</span> credits available
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/billing" className="cursor-pointer">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Billing & Credits
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/preferences" className="cursor-pointer">
                          <Settings className="h-4 w-4 mr-2" />
                          Workspace Preferences
                        </Link>
                      </DropdownMenuItem>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    <div className="py-1">
                      <DropdownMenuItem asChild>
                        <Link to="/contact" className="cursor-pointer">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Support / Help
                        </Link>
                      </DropdownMenuItem>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    <div className="py-1">
                      <DropdownMenuItem
                        onClick={() => signOut()}
                        className="text-destructive cursor-pointer focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Header Spacer */}
        <div className="h-14" />

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
            onSelectPrompt={(prompt) => handleSendMessage(prompt, "quick")}
            onFollowUpClick={(question) => handleSendMessage(question, "quick")}
            domainSnapshot={domainSnapshot}
            domainSnapshotLoading={snapshotLoading}
          />

          {/* Input Area - hide when All Domains */}
          {currentSector !== "all" && (
            <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4 sticky bottom-0">
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
