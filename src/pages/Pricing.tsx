import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, ArrowLeft, Zap, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "free",
    name: "Explorer",
    description: "For trying out Fashion AI",
    price: "0",
    credits: "10 credits/month",
    icon: Zap,
    features: [
      "10 research tasks per month",
      "Basic trend analysis",
      "PDF export",
      "7-day task history",
    ],
    cta: "Get started free",
    popular: false,
  },
  {
    id: "pro",
    name: "Professional",
    description: "For individual professionals",
    price: "49",
    credits: "100 credits/month",
    icon: Users,
    features: [
      "100 research tasks per month",
      "Deep industry analysis",
      "Excel, PDF & PPT exports",
      "Unlimited task history",
      "Priority execution",
      "All industry sectors",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    id: "studio",
    name: "Studio",
    description: "For agencies & teams",
    price: "199",
    credits: "500 credits/month",
    icon: Building2,
    features: [
      "500 research tasks per month",
      "Team workspaces (up to 10 users)",
      "Custom branding on exports",
      "API access",
      "Advanced analytics",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact sales",
    popular: false,
  },
];

const creditUsage = [
  { action: "Basic research task", credits: 1 },
  { action: "Deep analysis with sources", credits: 2 },
  { action: "Multi-source synthesis", credits: 3 },
  { action: "File generation (PDF/Excel/PPT)", credits: 1 },
  { action: "Real-time market data", credits: 2 },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-foreground rounded flex items-center justify-center">
              <span className="text-background font-semibold text-xs">F</span>
            </div>
            <span className="font-medium text-sm">Fashion AI</span>
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-editorial text-4xl md:text-5xl text-foreground mb-4">
            Choose your plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Scale your fashion intelligence from exploration to enterprise.
            All plans include access to our full research capabilities.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative shadow-premium",
                plan.popular && "border-foreground ring-1 ring-foreground"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                    <plan.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {plan.credits}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-semibold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link to={plan.id === "studio" ? "/contact" : "/signup"}>
                    {plan.cta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Credit Usage */}
        <div className="max-w-2xl mx-auto">
          <h2 className="font-editorial text-2xl text-foreground text-center mb-8">
            How credits work
          </h2>
          <Card className="shadow-premium">
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Action
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {creditUsage.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-6 py-3 text-sm text-foreground">{item.action}</td>
                      <td className="px-6 py-3 text-sm text-foreground text-right font-medium">
                        {item.credits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Credits reset monthly. Unused credits do not roll over.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Fashion AI. Professional intelligence for the fashion industry.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
