import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Leaf, Brain, Users, Target, ArrowRight, Sparkles } from "lucide-react";

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

  const team = [
    {
      name: "Leadership Team",
      description: "Fashion industry veterans combined with AI and technology experts, united by a vision to transform fashion intelligence."
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
                About McLeuker AI
              </span>
            </div>
            
            <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance leading-[1.1]">
              AI & Sustainability for Fashion
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              We're building the future of fashion intelligence — where AI-powered insights 
              meet sustainable practices to help brands make smarter decisions.
            </p>
          </div>

          {/* Mission Section */}
          <div className="max-w-5xl mx-auto mb-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-editorial text-3xl text-foreground mb-6">
                  Our Mission
                </h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  At McLeuker AI, we believe that the fashion industry stands at a crossroads. 
                  The demand for faster trend cycles, sustainable practices, and data-driven 
                  decisions has never been greater.
                </p>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Our mission is to empower fashion professionals with AI-powered tools that 
                  transform complex research into actionable intelligence — all while keeping 
                  sustainability at the forefront.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  From trend forecasting to supplier research, we're building the comprehensive 
                  platform that modern fashion businesses need to thrive.
                </p>
              </div>
              <div className="bg-gradient-to-br from-secondary to-accent rounded-xl p-8 border border-border">
                <div className="space-y-6">
                  <div>
                    <p className="text-4xl font-editorial text-foreground mb-2">100+</p>
                    <p className="text-sm text-muted-foreground">Fashion brands served</p>
                  </div>
                  <div>
                    <p className="text-4xl font-editorial text-foreground mb-2">50K+</p>
                    <p className="text-sm text-muted-foreground">Research tasks completed</p>
                  </div>
                  <div>
                    <p className="text-4xl font-editorial text-foreground mb-2">85%</p>
                    <p className="text-sm text-muted-foreground">Time saved on research</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="max-w-5xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="font-editorial text-3xl text-foreground mb-4">
                Our Values
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                The principles that guide everything we build
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, i) => (
                <div 
                  key={i} 
                  className="p-6 rounded-xl bg-card border border-border shadow-premium hover:shadow-elevated transition-shadow"
                >
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Vision Section */}
          <div className="max-w-4xl mx-auto mb-24 text-center">
            <h2 className="font-editorial text-3xl text-foreground mb-6">
              Our Vision
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              We envision a fashion industry where every decision is informed by intelligent 
              data, where sustainability isn't an afterthought but a foundation, and where 
              professionals can focus on creativity while AI handles the research heavy lifting.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
              <Leaf className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                Committed to net-zero by 2030
              </span>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-editorial text-3xl text-foreground mb-4">
              Ready to transform your workflow?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join leading fashion brands using McLeuker AI for smarter research.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
