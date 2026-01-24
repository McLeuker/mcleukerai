import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/Footer";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { SUBSCRIPTION_PLANS, CREDIT_REFILLS, CREDIT_USAGE } from "@/config/pricing";
import { Check, Zap, Crown, Building2, ArrowLeft, Loader2, Gift, AlertCircle } from "lucide-react";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

const planIcons = {
  free: Gift,
  pro: Zap,
  studio: Crown,
  enterprise: Building2,
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingRefill, setLoadingRefill] = useState(false);
  const { user } = useAuth();
  const { plan: currentPlan, subscribed, purchaseCredits, createCheckout } = useSubscription();

  const handleSubscribe = async (planId: string) => {
    if (planId === "enterprise" || planId === "free") return;
    
    setLoadingPlan(planId);
    try {
      await createCheckout(planId, isYearly ? "yearly" : "monthly");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleRefill = async () => {
    setLoadingRefill(true);
    try {
      await purchaseCredits("refill");
    } finally {
      setLoadingRefill(false);
    }
  };

  // Filter out hidden plans (enterprise)
  const visiblePlans = Object.entries(SUBSCRIPTION_PLANS).filter(
    ([_, plan]) => !('hidden' in plan && plan.hidden)
  );

  const canRefill = subscribed && (currentPlan === "pro" || currentPlan === "studio");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={mcleukerLogo} alt="McLeuker AI" className="h-8 w-auto" />
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to workspace
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-light mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Simple, transparent pricing designed for fashion professionals at every stage.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly
              </span>
              {isYearly && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Save 18%
                </Badge>
              )}
            </div>
          </div>

          {/* Plans Grid - 3 Columns */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {visiblePlans.map(([id, plan]) => {
              const Icon = planIcons[id as keyof typeof planIcons];
              const isPopular = 'popular' in plan && plan.popular;
              const isCurrentPlan = currentPlan === id;
              const isFree = id === "free";
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <Card
                  key={id}
                  className={`relative flex flex-col ${
                    isPopular ? 'border-primary shadow-lg ring-1 ring-primary/20 scale-105' : ''
                  } ${isCurrentPlan ? 'bg-primary/5' : ''}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 right-4 bg-secondary text-secondary-foreground">
                      Your Plan
                    </Badge>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${isPopular ? 'bg-primary/10' : 'bg-secondary'}`}>
                        <Icon className={`h-5 w-5 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">€{price}</span>
                        <span className="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.monthlyCredits?.toLocaleString()} credits/month
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : isFree ? (
                      user ? (
                        <Button variant="outline" className="w-full" disabled>
                          Included Free
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" asChild>
                          <Link to="/signup">Get Started Free</Link>
                        </Button>
                      )
                    ) : (
                      <Button
                        className={`w-full ${isPopular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                        variant={isPopular ? "default" : "secondary"}
                        onClick={() => handleSubscribe(id)}
                        disabled={loadingPlan === id || !user}
                      >
                        {loadingPlan === id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : user ? (
                          currentPlan !== "free" ? "Switch Plan" : "Subscribe Now"
                        ) : (
                          <Link to="/signup">Sign up to subscribe</Link>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Enterprise CTA */}
          <div className="max-w-3xl mx-auto mb-16">
            <Card className="bg-secondary/50">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-background">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Enterprise</h3>
                    <p className="text-sm text-muted-foreground">
                      Custom solutions for large organizations with dedicated support
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Credit Refill Section */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-light mb-2">Need More Credits?</h2>
              <p className="text-muted-foreground">
                Pro and Studio subscribers can purchase additional credits that never expire.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Pro Refill */}
              <Card className={currentPlan !== "pro" ? 'opacity-60' : ''}>
                <CardContent className="flex flex-col items-center justify-between gap-4 py-6">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">Pro Plan</Badge>
                    <div className="text-2xl font-bold">{CREDIT_REFILLS.pro.credits.toLocaleString()} Credits</div>
                    <p className="text-sm text-muted-foreground">
                      €{CREDIT_REFILLS.pro.perCredit.toFixed(3)} per credit • Max 1/month
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold">€{CREDIT_REFILLS.pro.price}</div>
                    <Button
                      onClick={handleRefill}
                      disabled={loadingRefill || currentPlan !== "pro"}
                      size="sm"
                    >
                      {loadingRefill ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Studio Refill */}
              <Card className={currentPlan !== "studio" ? 'opacity-60' : ''}>
                <CardContent className="flex flex-col items-center justify-between gap-4 py-6">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">Studio Plan</Badge>
                    <div className="text-2xl font-bold">{CREDIT_REFILLS.studio.credits.toLocaleString()} Credits</div>
                    <p className="text-sm text-muted-foreground">
                      €{CREDIT_REFILLS.studio.perCredit.toFixed(3)} per credit • Max 2/month
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold">€{CREDIT_REFILLS.studio.price}</div>
                    <Button
                      onClick={handleRefill}
                      disabled={loadingRefill || currentPlan !== "studio"}
                      size="sm"
                    >
                      {loadingRefill ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!canRefill && currentPlan !== "free" && (
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>You've reached your monthly refill limit</span>
                </div>
              </div>
            )}

            {currentPlan === "free" && (
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Credit refills are only available for Pro and Studio subscribers</span>
                </div>
              </div>
            )}
          </div>

          {/* Credit Usage Table */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-light mb-2">How Credits Work</h2>
              <p className="text-muted-foreground">
                Different actions consume different amounts of credits.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="divide-y divide-border">
                  {CREDIT_USAGE.map((item, index) => (
                    <div key={index} className="flex justify-between py-3">
                      <span className="text-muted-foreground">{item.action}</span>
                      <span className="font-medium">{item.credits} credits</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
