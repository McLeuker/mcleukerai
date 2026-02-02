import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { SUBSCRIPTION_PLANS, CREDIT_REFILLS, CREDIT_USAGE } from "@/config/pricing";
import { Check, Zap, Building2, Loader2, Gift, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const planIcons = {
  free: Gift,
  starter: Rocket,
  pro: Zap,
  enterprise: Building2,
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingRefill, setLoadingRefill] = useState(false);
  const { user } = useAuth();
  const { plan: currentPlan, purchaseCredits, createCheckout } = useSubscription();

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") return;
    
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

  const visiblePlans = Object.entries(SUBSCRIPTION_PLANS);

  return (
    <div className="min-h-screen bg-[#070707]">
      {/* Unified Top Navigation */}
      <TopNavigation variant="marketing" showSectorTabs={false} showCredits={false} />
      
      {/* Spacer for fixed nav */}
      <div className="h-16 lg:h-[72px]" />

      <main className="pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center py-16 lg:py-20">
            <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
              Pricing
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-luxury text-white/[0.92] mb-4">
              Simple Credit-Based Pricing
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-4">
              All features available to everyone. Credits are the only gate.
            </p>
            <p className="text-sm text-white/50 max-w-xl mx-auto mb-8">
              Free, Pro, or Studio — every user gets full access to AI research, market analysis, trend reports, and exports.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${!isYearly ? 'text-white' : 'text-white/50'}`}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20"
              />
              <span className={`text-sm font-medium ${isYearly ? 'text-white' : 'text-white/50'}`}>
                Yearly
              </span>
              {isYearly && (
                <Badge className="bg-white/10 text-white border-white/20">
                  Save 18%
                </Badge>
              )}
            </div>
          </div>

          {/* Plans Grid - 4 Columns */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
            {visiblePlans.map(([id, plan]) => {
              const Icon = planIcons[id as keyof typeof planIcons];
              const isPopular = 'popular' in plan && plan.popular;
              const isCurrentPlan = currentPlan === id;
              const isFree = id === "free";
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <Card
                  key={id}
                  className={cn(
                    "relative flex flex-col rounded-[20px]",
                    "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                    "border border-white/[0.10]",
                    isPopular && "border-white/[0.25] shadow-[0_14px_40px_rgba(0,0,0,0.55)] scale-105",
                    isCurrentPlan && "ring-1 ring-white/20"
                  )}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 right-4 bg-white/10 text-white border-white/20">
                      Your Plan
                    </Badge>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isPopular ? "bg-white/20" : "bg-white/10"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isPopular ? "text-white" : "text-white/70"
                        )} />
                      </div>
                      <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                    </div>
                    <CardDescription className="text-white/50">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">${price}</span>
                        <span className="text-white/50">/{isYearly ? 'year' : 'month'}</span>
                      </div>
                      <p className="text-sm text-white/50 mt-1">
                        {('dailyCredits' in plan ? plan.dailyCredits : 0)?.toLocaleString()} credits/day
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-white/60 shrink-0 mt-0.5" />
                          <span className="text-white/70">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {isCurrentPlan ? (
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/5 border-white/20 text-white/60" 
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : isFree ? (
                      user ? (
                        <Button 
                          variant="outline" 
                          className="w-full bg-white/5 border-white/20 text-white/60" 
                          disabled
                        >
                          Included Free
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20" 
                          asChild
                        >
                          <Link to="/signup">Get Started Free</Link>
                        </Button>
                      )
                    ) : !user ? (
                      <Button
                        className={cn(
                          "w-full",
                          isPopular 
                            ? "bg-white text-black hover:bg-white/90" 
                            : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        asChild
                      >
                        <Link to="/signup">Sign up to subscribe</Link>
                      </Button>
                    ) : (
                      <Button
                        className={cn(
                          "w-full",
                          isPopular 
                            ? "bg-white text-black hover:bg-white/90" 
                            : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        onClick={() => handleSubscribe(id)}
                        disabled={loadingPlan === id}
                      >
                        {loadingPlan === id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          currentPlan !== "free" ? "Switch Plan" : "Subscribe Now"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Need Custom Solution CTA */}
          <div className="max-w-3xl mx-auto mb-16">
            <Card className={cn(
              "rounded-[20px]",
              "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
              "border border-white/[0.10]"
            )}>
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-white/10">
                    <Building2 className="h-6 w-6 text-white/70" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Need a Custom Solution?</h3>
                    <p className="text-sm text-white/50">
                      Contact us for custom credit allocations, white-label options, or dedicated support
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  asChild
                >
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Credit Refill Section */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-luxury text-white/[0.92] mb-2">Need More Credits?</h2>
              <p className="text-white/50">
                Purchase additional credit packs anytime based on your plan.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Free Refill */}
              <Card className={cn(
                "rounded-[16px]",
                "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                "border border-white/[0.10]",
                currentPlan !== "free" && "opacity-60"
              )}>
                <CardContent className="flex flex-col items-center justify-between gap-4 py-6">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2 border-white/20 text-white/70">Free Plan</Badge>
                    <div className="text-2xl font-bold text-white">{CREDIT_REFILLS.free.credits.toLocaleString()} Credits</div>
                    <p className="text-sm text-white/50">
                      ${CREDIT_REFILLS.free.perCredit.toFixed(3)} per credit
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white">${CREDIT_REFILLS.free.price}</div>
                    <Button
                      onClick={handleRefill}
                      disabled={loadingRefill || currentPlan !== "free"}
                      size="sm"
                      className="bg-white text-black hover:bg-white/90"
                    >
                      {loadingRefill && currentPlan === "free" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Starter Refill */}
              <Card className={cn(
                "rounded-[16px]",
                "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                "border border-white/[0.10]",
                currentPlan !== "starter" && "opacity-60"
              )}>
                <CardContent className="flex flex-col items-center justify-between gap-4 py-6">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2 border-white/20 text-white/70">Starter Plan</Badge>
                    <div className="text-2xl font-bold text-white">{CREDIT_REFILLS.starter.credits.toLocaleString()} Credits</div>
                    <p className="text-sm text-white/50">
                      ${CREDIT_REFILLS.starter.perCredit.toFixed(3)} per credit
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white">${CREDIT_REFILLS.starter.price}</div>
                    <Button
                      onClick={handleRefill}
                      disabled={loadingRefill || currentPlan !== "starter"}
                      size="sm"
                      className="bg-white text-black hover:bg-white/90"
                    >
                      {loadingRefill && currentPlan === "starter" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Refill */}
              <Card className={cn(
                "rounded-[16px]",
                "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                "border border-white/[0.10]",
                currentPlan !== "pro" && "opacity-60"
              )}>
                <CardContent className="flex flex-col items-center justify-between gap-4 py-6">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2 border-white/20 text-white/70">Pro Plan</Badge>
                    <div className="text-2xl font-bold text-white">{CREDIT_REFILLS.pro.credits.toLocaleString()} Credits</div>
                    <p className="text-sm text-white/50">
                      ${CREDIT_REFILLS.pro.perCredit.toFixed(3)} per credit
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white">${CREDIT_REFILLS.pro.price}</div>
                    <Button
                      onClick={handleRefill}
                      disabled={loadingRefill || currentPlan !== "pro"}
                      size="sm"
                      className="bg-white text-black hover:bg-white/90"
                    >
                      {loadingRefill && currentPlan === "pro" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Enterprise Refill */}
              <Card className={cn(
                "rounded-[16px]",
                "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                "border border-white/[0.10]",
                currentPlan !== "enterprise" && "opacity-60"
              )}>
                <CardContent className="flex flex-col items-center justify-between gap-4 py-6">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2 border-white/20 text-white/70">Enterprise Plan</Badge>
                    <div className="text-2xl font-bold text-white">{CREDIT_REFILLS.enterprise.credits.toLocaleString()} Credits</div>
                    <p className="text-sm text-white/50">
                      ${CREDIT_REFILLS.enterprise.perCredit.toFixed(3)} per credit
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white">${CREDIT_REFILLS.enterprise.price}</div>
                    <Button
                      onClick={handleRefill}
                      disabled={loadingRefill || currentPlan !== "enterprise"}
                      size="sm"
                      className="bg-white text-black hover:bg-white/90"
                    >
                      {loadingRefill && currentPlan === "enterprise" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Credit Usage Table */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-luxury text-white/[0.92] mb-2">How Credits Work</h2>
              <p className="text-white/50">
                All actions available to all users. Credits are deducted per action.
              </p>
            </div>

            <Card className={cn(
              "rounded-[20px]",
              "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
              "border border-white/[0.10]"
            )}>
              <CardContent className="pt-6">
                <div className="divide-y divide-white/10">
                  {CREDIT_USAGE.map((item, index) => (
                    <div key={index} className="flex justify-between py-3">
                      <span className="text-white/60">{item.action}</span>
                      <span className="font-medium text-white">{item.credits} credits</span>
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
