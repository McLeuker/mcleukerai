import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight, Leaf, Sparkles, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import mcleukerLogo from "@/assets/mcleuker-logo.png";
import heroImage from "@/assets/hero-luxury.jpg";
import atelierImage from "@/assets/fashion-atelier.jpg";
import sustainableImage from "@/assets/sustainable-materials.jpg";

const Landing = () => {
  const [prompt, setPrompt] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      if (user) {
        navigate("/dashboard", { state: { initialPrompt: prompt } });
      } else {
        navigate("/login", { state: { redirectPrompt: prompt } });
      }
    }
  };

  const suggestionPrompts = [
    {
      title: "Trend Forecasting",
      prompt: "Analyze SS26 womenswear trends from Milan and Paris Fashion Week"
    },
    {
      title: "Supplier Research",
      prompt: "Find sustainable denim suppliers in Europe with MOQ under 500 units"
    },
    {
      title: "Market Intelligence",
      prompt: "Compare luxury handbag pricing across US, EU, and Asian markets"
    },
    {
      title: "Sustainability Audit",
      prompt: "Map sustainability certifications for European fashion brands"
    }
  ];

  const services = [
    {
      title: "Trend Forecasting",
      description: "AI-powered analysis of global fashion trends, from runway to street style."
    },
    {
      title: "Supplier Intelligence",
      description: "Comprehensive research and vetting of sustainable suppliers worldwide."
    },
    {
      title: "Market Analysis",
      description: "Deep insights into competitive landscapes and growth opportunities."
    },
    {
      title: "Sustainability Consulting",
      description: "Expert guidance on certifications, impact measurement, and ESG compliance."
    }
  ];

  const testimonials = [
    {
      quote: "McLeuker AI transformed how we approach trend research. What took weeks now takes hours.",
      author: "Creative Director",
      company: "European Fashion House"
    },
    {
      quote: "The supplier intelligence reports are incredibly thorough. A game-changer for our sourcing team.",
      author: "Head of Procurement",
      company: "Luxury Accessories Brand"
    },
    {
      quote: "Finally, an AI tool built by people who understand fashion. The outputs are genuinely useful.",
      author: "Brand Strategy Lead",
      company: "Sustainable Fashion Label"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? "bg-background/95 backdrop-blur-md border-b border-border" 
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 lg:px-12 h-16 lg:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={mcleukerLogo}
              alt="McLeuker AI"
              className="h-8 lg:h-10 w-auto"
            />
          </Link>
          
          <nav className="hidden lg:flex items-center gap-10">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              About
            </Link>
            <Link to="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              Solutions
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              Pricing
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline">
              Contact
            </Link>
          </nav>

          <nav className="flex items-center gap-4">
            {user ? (
              <Button size="sm" className="px-6" asChild>
                <Link to="/dashboard">
                  Enter Workspace
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="px-6" asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section - Full Screen */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Luxury fashion materials" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 lg:px-12 pt-24 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 mb-10 animate-fade-in">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground tracking-wide">
                AI & Sustainability for Fashion
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-foreground mb-8 leading-[1.05] animate-fade-in-slow">
              The Future of<br />Fashion Intelligence
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in">
              From a single prompt to finished reports, sourcing sheets, and presentation decks. 
              AI-powered research for fashion professionals who demand excellence.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
              <Button size="lg" className="px-8 py-6 text-base" asChild>
                <Link to="/signup">
                  Discover McLeuker AI
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-6 text-base bg-background/50 backdrop-blur-sm" asChild>
                <Link to="/contact">
                  Request a Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Brand Statement */}
      <section className="py-32 lg:py-40 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-luxury text-3xl md:text-4xl lg:text-5xl text-foreground leading-[1.2] mb-8">
              "We believe fashion intelligence should be as refined as the industry it serves."
            </h2>
            <p className="text-muted-foreground text-lg">
              — McLeuker AI
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 lg:py-32 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                Our Expertise
              </p>
              <h2 className="font-luxury text-4xl md:text-5xl text-foreground">
                Comprehensive Solutions
              </h2>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 stagger-children">
              {services.map((service, i) => (
                <div 
                  key={i} 
                  className="group p-8 lg:p-10 rounded-lg bg-card border border-border hover-lift cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-6">
                    <span className="text-5xl font-luxury text-muted-foreground/20">
                      0{i + 1}
                    </span>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-medium text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <Button size="lg" variant="outline" className="px-8" asChild>
                <Link to="/services">
                  Explore All Solutions
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Showcase - Atelier */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Image */}
              <div className="relative image-zoom rounded-lg overflow-hidden shadow-luxury">
                <img 
                  src={atelierImage} 
                  alt="Fashion atelier workspace" 
                  className="w-full aspect-[4/5] object-cover"
                />
              </div>

              {/* Content */}
              <div className="lg:py-12">
                <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                  Crafted for Excellence
                </p>
                <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                  Intelligence meets craftsmanship
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Just as the finest ateliers combine tradition with innovation, 
                  McLeuker AI blends deep fashion expertise with cutting-edge artificial intelligence. 
                  Every insight is curated, every report is refined.
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    "Professional-grade reports and presentations",
                    "Structured data exports ready for your workflow",
                    "Real deliverables, not just conversations"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button size="lg" asChild>
                  <Link to="/signup">
                    Start Your Journey
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability Focus */}
      <section className="py-24 lg:py-32 bg-secondary/30">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Content - Left on desktop */}
              <div className="lg:py-12 order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border mb-6">
                  <Leaf className="w-4 h-4 text-olive" />
                  <span className="text-sm text-muted-foreground">
                    Sustainability First
                  </span>
                </div>
                <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                  Fashion with purpose
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Sustainability isn't an afterthought—it's woven into everything we do. 
                  From supplier certifications to impact assessments, we help brands 
                  make informed decisions that benefit both business and planet.
                </p>
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div>
                    <p className="text-4xl font-luxury text-foreground mb-2">85%</p>
                    <p className="text-sm text-muted-foreground">Time saved on sustainability research</p>
                  </div>
                  <div>
                    <p className="text-4xl font-luxury text-foreground mb-2">100+</p>
                    <p className="text-sm text-muted-foreground">Certification databases tracked</p>
                  </div>
                </div>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/about">
                    Learn About Our Mission
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* Image - Right on desktop */}
              <div className="relative image-zoom rounded-lg overflow-hidden shadow-luxury order-1 lg:order-2">
                <img 
                  src={sustainableImage} 
                  alt="Sustainable fashion materials" 
                  className="w-full aspect-[4/5] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                Trusted by Industry Leaders
              </p>
              <h2 className="font-luxury text-4xl md:text-5xl text-foreground">
                What Our Clients Say
              </h2>
            </div>

            {/* Testimonials Grid */}
            <div className="grid md:grid-cols-3 gap-8 stagger-children">
              {testimonials.map((testimonial, i) => (
                <div 
                  key={i} 
                  className="p-8 rounded-lg bg-card border border-border hover-lift"
                >
                  <blockquote className="text-foreground text-lg leading-relaxed mb-8">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-24 lg:py-32 bg-foreground text-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-background/60 uppercase tracking-[0.2em] mb-4">
              Experience the Platform
            </p>
            <h2 className="font-luxury text-4xl md:text-5xl text-background mb-8">
              Try McLeuker AI
            </h2>
            <p className="text-background/70 text-lg mb-10 max-w-2xl mx-auto">
              Describe your research task and let our AI deliver professional-grade intelligence.
            </p>

            {/* Interactive Input */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-12">
              <div className="relative">
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  placeholder="e.g., Analyze SS26 womenswear color trends from Milan and Paris..." 
                  className="w-full h-32 px-6 py-5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-base"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }} 
                />
                <Button 
                  type="submit" 
                  disabled={!prompt.trim()} 
                  className="absolute bottom-4 right-4"
                >
                  Run Task
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>

            {/* Suggestion Prompts */}
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-background/50 uppercase tracking-[0.15em] mb-6">
                Try one of these examples
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {suggestionPrompts.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(suggestion.prompt)}
                    className="group p-4 rounded-lg bg-background/10 border border-background/20 hover:bg-background/20 hover:border-background/30 transition-all text-left"
                  >
                    <p className="text-sm font-medium text-background mb-1">
                      {suggestion.title}
                    </p>
                    <p className="text-sm text-background/60 line-clamp-2">
                      {suggestion.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 lg:py-40 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-luxury text-4xl md:text-5xl lg:text-6xl text-foreground mb-8 leading-[1.1]">
              Elevate your fashion intelligence
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto">
              Join leading fashion brands transforming their research with AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="px-10 py-6 text-base" asChild>
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-10 py-6 text-base" asChild>
                <Link to="/pricing">
                  View Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Landing;