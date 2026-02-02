import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSector, SECTORS, Sector } from "@/contexts/SectorContext";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Coins, 
  User, 
  CreditCard, 
  LogOut, 
  Settings, 
  HelpCircle,
  Plus
} from "lucide-react";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

interface TopNavigationProps {
  showSectorTabs?: boolean;
  showCredits?: boolean;
  showNewChat?: boolean;
  onNewChat?: () => void;
}

interface UserProfile {
  name: string | null;
  profile_image: string | null;
}

export function TopNavigation({ showSectorTabs = true, showCredits = true, showNewChat = false, onNewChat }: TopNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSector, setSector } = useSector();
  const { user, signOut } = useAuth();
  const { creditBalance, plan } = useSubscription();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [fetchUserProfile]);

  const isAuthPage = ["/login", "/signup"].includes(location.pathname);
  const isDashboard = location.pathname === "/dashboard";
  const isDomainPage = location.pathname.startsWith("/domain/");
  const showTabs = showSectorTabs && (isDashboard || isDomainPage);

  const handleSectorClick = (sector: Sector) => {
    setSector(sector);
    if (sector === "all") {
      navigate("/dashboard");
    } else {
      navigate(`/domain/${sector}`);
    }
  };

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

  if (isAuthPage) return null;

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "bg-gradient-to-b from-[#0D0D0D] to-[#0A0A0A]",
      "border-b border-white/[0.08]",
      "backdrop-blur-sm"
    )}>
      <div className="h-14 flex items-center justify-between px-4 lg:px-6">
        {/* Logo + optional New Chat */}
        <div className="flex items-center gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={mcleukerLogo}
              alt="McLeuker AI"
              className="h-8 w-auto"
            />
          </Link>
          
          {showNewChat && onNewChat && (
            <Button
              onClick={onNewChat}
              className="hidden lg:flex px-3.5 py-2 h-auto rounded-full gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-[13px] font-medium"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>

        {/* Sector Tabs - Center */}
        {showTabs && (
          <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => handleSectorClick(sector.id as Sector)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  currentSector === sector.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {sector.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Credits */}
              {showCredits && (
                <Link
                  to="/billing"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary hover:bg-accent transition-colors"
                >
                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{creditBalance} credits</span>
                </Link>
              )}

              {/* User Menu */}
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
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Sector Selector */}
      {showTabs && (
        <div className="lg:hidden border-t border-border px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => handleSectorClick(sector.id as Sector)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  currentSector === sector.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {sector.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
