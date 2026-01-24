import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { 
  TrendingUp, 
  Search, 
  BarChart3, 
  Leaf, 
  Brain, 
  Globe,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: TrendingUp,
      title: "Trend Forecasting",
      description: "AI-powered analysis of runway shows, street style, and social media to predict upcoming trends with precision.",
      benefits: [
        "Real-time trend monitoring across global markets",
        "Seasonal color and material predictions",
        "Consumer sentiment analysis",
        "Competitive trend benchmarking"
      ]
    },
    {
      icon: Search,
      title: "Supplier Research",
      description: "Comprehensive supplier discovery and evaluation with sustainability scoring and compliance verification.",
      benefits: [
        "Vetted supplier databases by category",
        "Sustainability certification tracking",
        "Cost and quality comparisons",
        "Risk assessment reports"
      ]
    },
    {
      icon: BarChart3,
      title: "Market Analysis",
      description: "Deep-dive market intelligence covering competitive landscapes, pricing strategies, and growth opportunities.",
      benefits: [
        "Competitor positioning analysis",
        "Market sizing and segmentation",
        "Pricing intelligence",
        "Entry strategy recommendations"
      ]
    },
    {
      icon: Leaf,
      title: "Sustainability Consulting",
      description: "Expert guidance on sustainable practices, certifications, and impact measurement for fashion brands.",
      benefits: [
        "Carbon footprint assessment",
        "Certification pathway planning",
        "Sustainable material sourcing",
        "Impact reporting and ESG compliance"
      ]
    },
    {
      icon: Brain,
      title: "AI Strategy & Tools",
      description: "Custom AI solutions designed specifically for fashion businesses, from automation to predictive analytics.",
      benefits: [
        "Custom AI model development",
        "Workflow automation",
        "Predictive demand planning",
        "Integration consulting"
      ]
    },
    {
      icon: Globe,
      title: "Digital Strategy",
      description: "Comprehensive digital transformation guidance covering e-commerce, marketing technology, and data infrastructure.",
      benefits: [
        "E-commerce optimization",
        "Marketing tech stack audit",
        "Data architecture planning",
        "Digital maturity assessment"
      ]
    }
  ];

  const deliverables = [
    {
      icon: FileText,
      title: "Professional Reports",
      description: "Comprehensive PDF analyses with executive summaries, detailed findings, and actionable recommendations."
    },
    {
      icon: BarChart3,
      title: "Data Exports",
      description: "Structured Excel files with supplier lists, trend data, and analysis ready for your workflows."
    },
    {
      icon: TrendingUp,
      title: "Presentations",
      description: "Polished slide decks designed for board meetings, client presentations, and team briefings."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavigation showSectorTabs={false} showCredits={false} />

      {/* Hero Section */}
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-8">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                Our Services
              </span>
            </div>
            
            <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance leading-[1.1]">
              AI-Powered Fashion Intelligence
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              From trend forecasting to sustainability consulting, we provide comprehensive 
              AI-driven solutions for modern fashion businesses.
            </p>
          </div>

          {/* Services Grid */}
          <div className="max-w-6xl mx-auto mb-24">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, i) => (
                <div 
                  key={i} 
                  className="p-6 rounded-xl bg-card border border-border shadow-premium hover:shadow-elevated transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-5 group-hover:bg-accent transition-colors">
                    <service.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {service.description}
                  </p>
                  <ul className="space-y-2">
                    {service.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables Section */}
          <div className="max-w-5xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="font-editorial text-3xl text-foreground mb-4">
                Professional Deliverables
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every project concludes with polished, professional outputs ready for immediate use.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {deliverables.map((item, i) => (
                <div 
                  key={i} 
                  className="p-6 rounded-xl bg-secondary/50 border border-border text-center"
                >
                  <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center mb-4 mx-auto border border-border">
                    <item.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="max-w-4xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="font-editorial text-3xl text-foreground mb-4">
                How It Works
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Describe Your Task", description: "Enter a detailed prompt describing your research need or business question." },
                { step: "02", title: "AI Executes", description: "Our AI researches, analyzes, and structures findings with human-level quality." },
                { step: "03", title: "Get Deliverables", description: "Receive polished reports, data exports, or presentations ready to use." }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-5xl font-editorial text-muted-foreground/30 mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-editorial text-3xl text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Try McLeuker AI free and see how AI can transform your fashion research.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Start free trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
