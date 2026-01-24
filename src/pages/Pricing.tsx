import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/Footer";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, CREDIT_USAGE } from "@/config/pricing";
import { Check, Sparkles, Zap, Building2, Crown, ArrowLeft, Loader2 } from "lucide-react";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

const planIcons = {
  starter: Sparkles,
  professional: Zap,
  studio: Crown,
  enterprise: Building2,
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const { user } = useAuth();
  const { plan: currentPlan, createCheckout, purchaseCredits } = useSubscription();

  const handleSubscribe = async (planId: string) => {
    if (planId === "enterprise") return;
    
    setLoadingPlan(planId);
    try {
      await createCheckout(planId, isYearly ? "yearly" : "monthly");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePurchaseCredits = async (packId: string) => {
    setLoadingPack(packId);
    try {
      await purchaseCredits(packId);
    } finally {
      setLoadingPack(null);
    }
  };

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
              Scale your fashion intelligence with flexible pricing designed for every stage of growth.
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

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {(Object.entries(SUBSCRIPTION_PLANS) as [string, typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS]][]).map(([id, plan]) => {
              const Icon = planIcons[id as keyof typeof planIcons];
              const isPopular = 'popular' in plan && plan.popular;
              const isCurrentPlan = currentPlan === id;
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const isEnterprise = id === "enterprise";

              return (
                <Card
                  key={id}
                  className={`relative flex flex-col ${
                    isPopular ? 'border-primary shadow-lg ring-1 ring-primary/20' : ''
                  } ${isCurrentPlan ? 'bg-primary/5' : ''}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 right-4 bg-secondary text-secondary-foreground">
                      Current Plan
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
                      {isEnterprise ? (
                        <div className="text-2xl font-semibold">Custom</div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">€{price}</span>
                            <span className="text-muted-foreground">/{isYearly ? 'year' : 'month'}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan.monthlyCredits?.toLocaleString()} credits/month
                          </p>
                        </>
                      )}
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
                    {isEnterprise ? (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/contact">Contact Sales</Link>
                      </Button>
                    ) : isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
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
                          currentPlan !== "free" ? "Switch Plan" : "Get Started"
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

          {/* Credit Packs Section */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif font-light mb-4">Need More Credits?</h2>
              <p className="text-muted-foreground">
                Purchase additional credits that never expire and stack with your subscription.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {(Object.entries(CREDIT_PACKS) as [string, typeof CREDIT_PACKS[keyof typeof CREDIT_PACKS]][]).map(([id, pack]) => {
                const isPackPopular = 'popular' in pack && pack.popular;
                
                return (
                  <Card key={id} className={`relative ${isPackPopular ? 'border-primary shadow-md' : ''}`}>
                    {isPackPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Best Value
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-2xl">{pack.credits.toLocaleString()} Credits</CardTitle>
                      <CardDescription>€{pack.perCredit.toFixed(3)} per credit</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-3xl font-bold mb-4">€{pack.price}</div>
                      <Button
                        className="w-full"
                        variant={isPackPopular ? "default" : "outline"}
                        onClick={() => handlePurchaseCredits(id)}
                        disabled={loadingPack === id || !user}
                      >
                        {loadingPack === id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Purchase"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
