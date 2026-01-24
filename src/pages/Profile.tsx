import { useState } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountOverview } from "@/components/profile/AccountOverview";
import { SubscriptionCredits } from "@/components/profile/SubscriptionCredits";
import { UsageActivity } from "@/components/profile/UsageActivity";
import { Preferences } from "@/components/profile/Preferences";
import { Security } from "@/components/profile/Security";
import { BillingHistory } from "@/components/profile/BillingHistory";
import { 
  User, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Shield, 
  Receipt 
} from "lucide-react";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "subscription", label: "Subscription & Credits", icon: CreditCard },
    { id: "usage", label: "Usage", icon: BarChart3 },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: Receipt },
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
            Manage your account, subscription, and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Desktop Tab Navigation */}
          <TabsList className="hidden lg:flex w-full h-auto p-1 bg-card border border-border rounded-lg gap-1">
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

          {/* Mobile Tab Navigation */}
          <div className="lg:hidden">
            <TabsList className="flex flex-wrap w-full h-auto p-1 bg-card border border-border rounded-lg gap-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-1 min-w-[calc(33%-4px)] flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background rounded-md"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            <TabsContent value="account" className="mt-0">
              <AccountOverview />
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-0">
              <SubscriptionCredits />
            </TabsContent>
            
            <TabsContent value="usage" className="mt-0">
              <UsageActivity />
            </TabsContent>
            
            <TabsContent value="preferences" className="mt-0">
              <Preferences />
            </TabsContent>
            
            <TabsContent value="security" className="mt-0">
              <Security />
            </TabsContent>
            
            <TabsContent value="billing" className="mt-0">
              <BillingHistory />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
