import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SUBSCRIPTION_PLANS, CREDIT_REFILLS } from "@/config/pricing";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { 
  Zap, 
  Calendar, 
  RefreshCw, 
  ArrowUpRight, 
  CreditCard,
  Coins,
  TrendingUp
} from "lucide-react";

export function SubscriptionCredits() {
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
    loading,
    createCheckout,
    purchaseCredits,
    openCustomerPortal,
    canRefill,
    getPlanConfig,
  } = useSubscription();

  const planConfig = getPlanConfig();
  const totalCredits = monthlyCredits + extraCredits;
  const usedCredits = totalCredits - creditBalance;
  const usagePercentage = totalCredits > 0 ? ((creditBalance / totalCredits) * 100) : 0;

  const maxRefills = plan === "pro" ? 1 : plan === "studio" ? 2 : 0;
  const refillsRemaining = maxRefills - refillsThisMonth;
  const refillPack = plan === "studio" ? CREDIT_REFILLS.studio : CREDIT_REFILLS.pro;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-card rounded-lg" />
        <div className="h-32 bg-card rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
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
            <Badge variant={subscribed ? "default" : "outline"} className="text-sm px-3 py-1">
              {plan.toUpperCase()}
              {billingCycle && ` — ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-2xl font-light">
                {planConfig.monthlyPrice === 0 
                  ? "Free" 
                  : `€${billingCycle === "yearly" 
                      ? Math.round(planConfig.yearlyPrice! / 12) 
                      : planConfig.monthlyPrice
                    }/mo`
                }
              </p>
              {billingCycle === "yearly" && planConfig.yearlyPrice && (
                <p className="text-xs text-muted-foreground">
                  Billed €{planConfig.yearlyPrice}/year
                </p>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="text-2xl font-light capitalize">
                {billingCycle || "—"}
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
                Switch to {billingCycle === "monthly" ? "Yearly" : "Monthly"}
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

      {/* Credits Overview */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credits
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
                <p>of {totalCredits.toLocaleString()} total</p>
              </div>
            </div>
            
            <Progress 
              value={usagePercentage} 
              className="h-2 bg-muted"
            />
            
            {usagePercentage < 20 && (
              <p className="text-sm text-yellow-500 flex items-center gap-1">
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
                Monthly Credits
              </p>
              <p className="text-xl font-light">{monthlyCredits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Reset each billing cycle</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Bonus Credits
              </p>
              <p className="text-xl font-light">{extraCredits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Never expire</p>
            </div>
          </div>

          {/* Refill Section */}
          {subscribed && plan !== "free" && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Credit Refills</h4>
                    <p className="text-sm text-muted-foreground">
                      {refillsRemaining} of {maxRefills} refills remaining this month
                    </p>
                  </div>
                  <Badge variant="outline">
                    {refillPack.credits.toLocaleString()} credits / €{refillPack.price}
                  </Badge>
                </div>
                
                <Button 
                  onClick={() => purchaseCredits("refill")}
                  disabled={!canRefill()}
                  className="w-full sm:w-auto"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Purchase {refillPack.credits.toLocaleString()} Credits
                </Button>
                
                {!canRefill() && (
                  <p className="text-sm text-muted-foreground">
                    You've reached your monthly refill limit. Refills reset on your next billing date.
                  </p>
                )}
              </div>
            </>
          )}

          {!subscribed && (
            <>
              <Separator />
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Upgrade to Pro or Studio to purchase additional credits
                </p>
                <Button asChild>
                  <Link to="/pricing">View Plans</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
