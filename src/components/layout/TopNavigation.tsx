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
  Plus,
  Menu,
  X
} from "lucide-react";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

interface TopNavigationProps {
  showSectorTabs?: boolean;
  showCredits?: boolean;
  showNewChat?: boolean;
  onNewChat?: () => void;
  variant?: "app" | "marketing";
}

interface UserProfile {
  name: string | null;
  profile_image: string | null;
}

const marketingLinks = [
  { name: "About", href: "/about" },
  { name: "Solutions", href: "/services" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

export function TopNavigation({ 
  showSectorTabs = true, 
  showCredits = true, 
  showNewChat = false, 
  onNewChat,
  variant = "app"
}: TopNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSector, setSector } = useSector();
  const { user, signOut } = useAuth();
  const { creditBalance, plan } = useSubscription();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isAuthPage = ["/login", "/signup"].includes(location.pathname);
  const isDashboard = location.pathname === "/dashboard";
  const isDomainPage = location.pathname.startsWith("/domain/");
  const showTabs = showSectorTabs && (isDashboard || isDomainPage);
  const isMarketing = variant === "marketing";

  const isActiveLink = (path: string) => location.pathname === path;

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
      "bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A]",
      "border-b border-white/[0.08]",
      "backdrop-blur-sm",
      "shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
    )}>
      <div className="h-16 lg:h-[72px] flex items-center justify-between px-6 lg:px-8">
        {/* Logo + optional New Chat */}
        <div className="flex items-center gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={mcleukerLogo}
              alt="McLeuker AI"
              className="h-8 lg:h-9 w-auto"
            />
          </Link>
          
          {showNewChat && onNewChat && (
            <Button
              onClick={onNewChat}
              className="hidden lg:flex px-3.5 py-2 h-auto rounded-full gap-1.5 bg-white text-black hover:bg-white/90 text-[13px] font-medium"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>

        {/* Marketing Links - Center (for marketing variant) */}
        {isMarketing && (
          <nav className="hidden lg:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm transition-colors py-1",
                  isActiveLink(link.href)
                    ? "text-white/90 border-b-2 border-white/[0.18]"
                    : "text-white/60 hover:text-white/90"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Sector Tabs - Center (for app variant) */}
        {showTabs && !isMarketing && (
          <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => handleSectorClick(sector.id as Sector)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  currentSector === sector.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {sector.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle (Marketing) */}
          {isMarketing && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/70 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

          {user ? (
            <>
              {/* Credits */}
              {showCredits && (
                <Link
                  to="/billing"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/[0.08] transition-colors"
                >
                  <Coins className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-xs font-medium text-white/80">{creditBalance} credits</span>
                </Link>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={userProfile?.profile_image || user.user_metadata?.avatar_url || user.user_metadata?.picture} />
                      <AvatarFallback className="text-xs bg-white/10 text-white">
                        {getInitials(userProfile?.name || null, user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#141414] border-white/10">
                  <div className="px-3 py-2 border-b border-white/10">
                    {userProfile?.name && (
                      <p className="text-sm font-medium text-white truncate">{userProfile.name}</p>
                    )}
                    <p className={cn("text-sm truncate", userProfile?.name ? "text-white/60" : "font-medium text-white")}>{user.email}</p>
                    <p className="text-xs text-white/50 capitalize mt-0.5">{plan} plan</p>
                    <div className="text-xs text-white/50 mt-1">
                      <span className="font-medium text-white">{creditBalance}</span> credits available
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
                      <Link to="/profile" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
                      <Link to="/billing" className="cursor-pointer">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Billing & Credits
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
                      <Link to="/preferences" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Workspace Preferences
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  
                  <DropdownMenuSeparator className="bg-white/10" />
                  
                  <div className="py-1">
                    <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
                      <Link to="/contact" className="cursor-pointer">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Support / Help
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  
                  <DropdownMenuSeparator className="bg-white/10" />
                  
                  <div className="py-1">
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="text-red-400 cursor-pointer focus:bg-white/10 focus:text-red-400"
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden sm:inline-flex text-white/70 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button 
                size="sm" 
                className="bg-white text-black hover:bg-white/90"
                asChild
              >
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Marketing Menu */}
      {isMarketing && mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] px-6 py-4 bg-[#0A0A0A]">
          <nav className="flex flex-col gap-3">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm py-2 transition-colors",
                  isActiveLink(link.href)
                    ? "text-white"
                    : "text-white/60 hover:text-white"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Mobile Sector Selector (App variant) */}
      {showTabs && !isMarketing && (
        <div className="lg:hidden border-t border-white/[0.08] px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => handleSectorClick(sector.id as Sector)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  currentSector === sector.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80"
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
