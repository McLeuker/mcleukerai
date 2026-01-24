import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Leaf, Brain, Users, Target, ArrowRight } from "lucide-react";
import sustainableImage from "@/assets/sustainable-materials.jpg";

const About = () => {
  const values = [
    {
      icon: Brain,
      title: "AI-First Innovation",
      description: "We leverage cutting-edge artificial intelligence to transform how fashion professionals work, making complex research accessible and actionable."
    },
    {
      icon: Leaf,
      title: "Sustainability Focus",
      description: "Environmental responsibility is at the core of everything we build. We help brands make informed, sustainable decisions."
    },
    {
      icon: Target,
      title: "Real Results",
      description: "No fluff, no buzzwords. We deliver concrete, professional-grade outputs that drive real business value."
    },
    {
      icon: Users,
      title: "Human-Centered",
      description: "Technology should amplify human expertise, not replace it. We build tools that make professionals more effective."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavigation showSectorTabs={false} showCredits={false} />

      {/* Hero Section */}
      <main className="pt-20">
        {/* Hero */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-6">
                About McLeuker AI
              </p>
              
              <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl text-foreground mb-8 leading-[1.05]">
                AI & Sustainability<br />for Fashion
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                We're building the future of fashion intelligence — where AI-powered insights 
                meet sustainable practices to help brands make smarter decisions.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 lg:py-32 bg-secondary/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                    Our Mission
                  </p>
                  <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                    Empowering fashion with intelligence
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    At McLeuker AI, we believe that the fashion industry stands at a crossroads. 
                    The demand for faster trend cycles, sustainable practices, and data-driven 
                    decisions has never been greater.
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    Our mission is to empower fashion professionals with AI-powered tools that 
                    transform complex research into actionable intelligence — all while keeping 
                    sustainability at the forefront.
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    From trend forecasting to supplier research, we're building the comprehensive 
                    platform that modern fashion businesses need to thrive.
                  </p>
                </div>
                
                {/* Stats */}
                <div className="bg-card rounded-lg border border-border p-10 lg:p-12 shadow-luxury">
                  <div className="space-y-10">
                    <div>
                      <p className="text-5xl lg:text-6xl font-luxury text-foreground mb-3">100+</p>
                      <p className="text-muted-foreground">Fashion brands served</p>
                    </div>
                    <div className="border-t border-border pt-10">
                      <p className="text-5xl lg:text-6xl font-luxury text-foreground mb-3">50K+</p>
                      <p className="text-muted-foreground">Research tasks completed</p>
                    </div>
                    <div className="border-t border-border pt-10">
                      <p className="text-5xl lg:text-6xl font-luxury text-foreground mb-3">85%</p>
                      <p className="text-muted-foreground">Time saved on research</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                  What Drives Us
                </p>
                <h2 className="font-luxury text-4xl md:text-5xl text-foreground">
                  Our Values
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 stagger-children">
                {values.map((value, i) => (
                  <div 
                    key={i} 
                    className="p-8 lg:p-10 rounded-lg bg-card border border-border hover-lift"
                  >
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-6">
                      <value.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-medium text-foreground mb-4">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-24 lg:py-32 bg-secondary/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Image */}
                <div className="relative image-zoom rounded-lg overflow-hidden shadow-luxury">
                  <img 
                    src={sustainableImage} 
                    alt="Sustainable fashion materials" 
                    className="w-full aspect-[4/5] object-cover"
                  />
                </div>

                {/* Content */}
                <div className="lg:py-12">
                  <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-4">
                    Our Vision
                  </p>
                  <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                    A sustainable future for fashion
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                    We envision a fashion industry where every decision is informed by intelligent 
                    data, where sustainability isn't an afterthought but a foundation, and where 
                    professionals can focus on creativity while AI handles the research heavy lifting.
                  </p>
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-background border border-border">
                    <Leaf className="w-5 h-5 text-olive" />
                    <span className="text-foreground font-medium">
                      Committed to net-zero by 2030
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 lg:py-40">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                Ready to transform your workflow?
              </h2>
              <p className="text-muted-foreground text-lg mb-12">
                Join leading fashion brands using McLeuker AI for smarter research.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="px-10 py-6 text-base" asChild>
                  <Link to="/signup">
                    Get Started Free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="px-10 py-6 text-base" asChild>
                  <Link to="/contact">Contact Us</Link>
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

export default About;