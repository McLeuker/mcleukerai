import { useState, useEffect } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { SUBSCRIPTION_PLANS, CREDIT_REFILLS } from "@/config/pricing";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { 
  CreditCard, 
  Coins, 
  Calendar, 
  RefreshCw, 
  TrendingUp,
  ArrowUpRight,
  Zap,
  Receipt,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

interface Task {
  id: string;
  prompt: string;
  created_at: string;
  status: string;
}

const Billing = () => {
  const { user } = useAuth();
  const {
    plan,
    billingCycle,
    subscriptionEnd,
    monthlyCredits,
    extraCredits,
    creditBalance,
    refillsThisMonth,
    subscribed,
    loading: subLoading,
    createCheckout,
    purchaseCredits,
    openCustomerPortal,
    canRefill,
    getPlanConfig,
  } = useSubscription();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usageTransactions, setUsageTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const planConfig = getPlanConfig();
  const totalCredits = monthlyCredits + extraCredits;
  const usedCredits = totalCredits - creditBalance;
  const usagePercentage = totalCredits > 0 ? ((creditBalance / totalCredits) * 100) : 0;
  const maxRefills = plan === "pro" ? 1 : plan === "studio" ? 2 : 0;
  const refillsRemaining = maxRefills - refillsThisMonth;
  const refillPack = plan === "studio" ? CREDIT_REFILLS.studio : CREDIT_REFILLS.pro;

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch billing transactions
      const { data: billingData } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("type", ["purchase", "subscription_reset", "refill"])
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch usage transactions
      const { data: usageData } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "usage")
        .order("created_at", { ascending: false })
        .limit(50);

      setTransactions(billingData || []);
      setUsageTransactions(usageData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscribed) return <Badge variant="outline">Free</Badge>;
    if (subscriptionEnd && new Date(subscriptionEnd) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>;
  };

  const getActionType = (description: string) => {
    if (description?.toLowerCase().includes("research")) return "AI Research";
    if (description?.toLowerCase().includes("market")) return "Market Analysis";
    if (description?.toLowerCase().includes("trend")) return "Trend Report";
    if (description?.toLowerCase().includes("supplier")) return "Supplier Search";
    if (description?.toLowerCase().includes("pdf")) return "PDF Export";
    if (description?.toLowerCase().includes("excel")) return "Excel Export";
    return "AI Query";
  };

  if (subLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation showSectorTabs={false} showCredits={false} />
        <div className="h-14 lg:h-[72px]" />
        <main className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
          <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-card rounded w-1/3" />
            <div className="h-48 bg-card rounded-lg" />
            <div className="h-48 bg-card rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation showSectorTabs={false} showCredits={false} />
      
      <div className="h-14 lg:h-[72px]" />
      
      <main className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-3xl lg:text-4xl font-serif font-light tracking-tight">
            Billing & Credits
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription, credits, and billing history
          </p>
        </div>

        <div className="space-y-8">
          {/* A. Current Plan */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Current Plan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {planConfig.description}
                  </CardDescription>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-2xl font-light capitalize">{plan}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Billing Cycle</p>
                  <p className="text-2xl font-light capitalize">
                    {billingCycle || "—"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-2xl font-light">
                    {planConfig.monthlyPrice === 0 
                      ? "€0" 
                      : `€${billingCycle === "yearly" 
                          ? Math.round(planConfig.yearlyPrice! / 12) 
                          : planConfig.monthlyPrice
                        }/mo`
                    }
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Renewal Date</p>
                  <p className="text-2xl font-light">
                    {subscriptionEnd 
                      ? format(new Date(subscriptionEnd), "MMM d, yyyy")
                      : "—"
                    }
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/pricing" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {subscribed ? "Change Plan" : "Upgrade Plan"}
                  </Link>
                </Button>
                
                {subscribed && billingCycle && (
                  <Button 
                    variant="outline" 
                    onClick={() => createCheckout(plan, billingCycle === "monthly" ? "yearly" : "monthly")}
                  >
                    Switch to {billingCycle === "monthly" ? "Yearly (Save 18%)" : "Monthly"}
                  </Button>
                )}
                
                {subscribed && (
                  <Button 
                    variant="ghost" 
                    onClick={openCustomerPortal}
                    className="text-muted-foreground"
                  >
                    Manage Subscription
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* B. Credit Overview */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Credit Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Credit Display */}
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-light">{creditBalance.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">credits available</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{usedCredits.toLocaleString()} used this period</p>
                  </div>
                </div>
                
                <Progress 
                  value={usagePercentage} 
                  className="h-2 bg-muted"
                />
                
                {usagePercentage < 20 && creditBalance > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    Low credits — consider a refill
                  </p>
                )}
              </div>

              <Separator />

              {/* Credit Breakdown */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Monthly Credits Included
                  </p>
                  <p className="text-2xl font-light">{planConfig.monthlyCredits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Remaining: {monthlyCredits.toLocaleString()}</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refill Credits Balance
                  </p>
                  <p className="text-2xl font-light">{extraCredits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Never expire</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* C. Credit Usage Breakdown */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Credit Usage Breakdown
              </CardTitle>
              <CardDescription>
                Recent credit consumption by action
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Date</TableHead>
                      <TableHead>Action Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Task</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageTransactions.slice(0, 15).map((tx) => (
                      <TableRow key={tx.id} className="border-border">
                        <TableCell className="text-sm">
                          {format(new Date(tx.created_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getActionType(tx.description || "")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-[200px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {tx.description || "AI query"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-400">
                          {tx.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No usage yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start using AI features to see your usage here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* D. Billing History */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Billing History
                  </CardTitle>
                  <CardDescription>
                    Invoices and payment history
                  </CardDescription>
                </div>
                {subscribed && (
                  <Button variant="outline" size="sm" onClick={openCustomerPortal}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoices
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-border">
                        <TableCell className="text-sm">
                          {format(new Date(tx.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {tx.description || (tx.type === "subscription_reset" ? "Monthly credit allocation" : "Credit purchase")}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-green-500 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-500">
                          +{tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No billing history yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* E. Credit Refill */}
          {subscribed && plan !== "free" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Credit Refill
                </CardTitle>
                <CardDescription>
                  Purchase additional credits for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{refillPack.credits.toLocaleString()} Credit Pack</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Refill credits never expire and are used after monthly credits.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-light">€{refillPack.price}</p>
                      <p className="text-xs text-muted-foreground">one-time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {refillsRemaining} of {maxRefills} refills remaining this month
                    </p>
                    <Button 
                      onClick={() => purchaseCredits("refill")}
                      disabled={!canRefill()}
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Purchase Credits
                    </Button>
                  </div>
                  
                  {!canRefill() && (
                    <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                      You've reached your monthly refill limit. Refills reset on your next billing date.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!subscribed && (
            <Card className="border-border bg-card">
              <CardContent className="py-8 text-center">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Unlock Credit Refills</h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade to Pro or Studio to purchase additional credits that never expire.
                </p>
                <Button asChild>
                  <Link to="/pricing">View Plans</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Billing;
