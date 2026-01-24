import { useState } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountOverview } from "@/components/profile/AccountOverview";
import { Security } from "@/components/profile/Security";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Shield,
  CreditCard,
  Settings,
  ArrowRight
} from "lucide-react";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation showSectorTabs={false} showCredits={false} />
      
      <div className="h-14 lg:h-[72px]" />
      
      <main className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-3xl lg:text-4xl font-serif font-light tracking-tight">
            Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and security settings
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Link 
            to="/billing" 
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Billing & Credits</p>
                <p className="text-sm text-muted-foreground">Manage subscription and credits</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          
          <Link 
            to="/preferences" 
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Workspace Preferences</p>
                <p className="text-sm text-muted-foreground">Customize your AI experience</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Tab Navigation */}
          <TabsList className="flex w-full h-auto p-1 bg-card border border-border rounded-lg gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            <TabsContent value="account" className="mt-0">
              <AccountOverview />
            </TabsContent>
            
            <TabsContent value="security" className="mt-0">
              <Security />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
