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
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import atelierImage from "@/assets/fashion-atelier.jpg";

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

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-6">
                Our Solutions
              </p>
              
              <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl text-foreground mb-8 leading-[1.05]">
                AI-Powered Fashion Intelligence
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                From trend forecasting to sustainability consulting, we provide comprehensive 
                AI-driven solutions for modern fashion businesses.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-24 lg:py-32 bg-secondary/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children">
                {services.map((service, i) => (
                  <div 
                    key={i} 
                    className="group p-8 lg:p-10 rounded-lg bg-card border border-border hover-lift"
                  >
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-6 group-hover:bg-accent transition-colors">
                      <service.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-medium text-foreground mb-4">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {service.description}
                    </p>
                    <ul className="space-y-3">
                      {service.benefits.map((benefit, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Deliverables Section */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                {/* Image */}
                <div className="relative image-zoom rounded-lg overflow-hidden shadow-luxury">
                  <img 
                    src={atelierImage} 
                    alt="Fashion atelier workspace" 
                    className="w-full aspect-square object-cover"
                  />
                </div>

                {/* Content */}
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                    Professional Deliverables
                  </p>
                  <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                    Real outputs, not just insights
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                    Every project concludes with polished, professional outputs ready for immediate use. 
                    No more copying and pasting from chat interfaces.
                  </p>
                  
                  <div className="space-y-8">
                    {deliverables.map((item, i) => (
                      <div key={i} className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <item.icon className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-foreground mb-1">
                            {item.title}
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 lg:py-32 bg-foreground text-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-20">
                <p className="text-sm text-background/60 uppercase tracking-[0.2em] mb-4">
                  Simple Process
                </p>
                <h2 className="font-luxury text-4xl md:text-5xl text-background">
                  How It Works
                </h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
                {[
                  { 
                    step: "01", 
                    title: "Describe Your Task", 
                    description: "Enter a detailed prompt describing your research need or business question." 
                  },
                  { 
                    step: "02", 
                    title: "AI Executes", 
                    description: "Our AI researches, analyzes, and structures findings with human-level quality." 
                  },
                  { 
                    step: "03", 
                    title: "Get Deliverables", 
                    description: "Receive polished reports, data exports, or presentations ready to use." 
                  }
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="text-6xl lg:text-7xl font-luxury text-background/20 mb-6">
                      {item.step}
                    </div>
                    <h3 className="text-xl lg:text-2xl font-medium text-background mb-4">
                      {item.title}
                    </h3>
                    <p className="text-background/70 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 lg:py-40">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground text-lg mb-12">
                Try McLeuker AI free and see how AI can transform your fashion research.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="px-10 py-6 text-base" asChild>
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="px-10 py-6 text-base" asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Services;