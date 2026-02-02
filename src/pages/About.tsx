import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Leaf, Brain, Users, Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="min-h-screen bg-[#070707] flex flex-col">
      <TopNavigation variant="marketing" showSectorTabs={false} showCredits={false} />
      
      {/* Spacer for fixed nav */}
      <div className="h-16 lg:h-[72px]" />

      <main>
        {/* Hero */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-6">
                About McLeuker AI
              </p>
              
              <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl text-white/[0.92] mb-8 leading-[1.05]">
                AI & Sustainability<br />for Fashion
              </h1>
              
              <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed">
                We're building the future of fashion intelligence — where AI-powered insights 
                meet sustainable practices to help brands make smarter decisions.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 lg:py-32 bg-[#0B0B0B]">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                <div>
                  <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
                    Our Mission
                  </p>
                  <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92] mb-8 leading-[1.1]">
                    Empowering fashion with intelligence
                  </h2>
                  <p className="text-white/65 text-lg leading-relaxed mb-6">
                    At McLeuker AI, we believe that the fashion industry stands at a crossroads. 
                    The demand for faster trend cycles, sustainable practices, and data-driven 
                    decisions has never been greater.
                  </p>
                  <p className="text-white/65 text-lg leading-relaxed mb-6">
                    Our mission is to empower fashion professionals with AI-powered tools that 
                    transform complex research into actionable intelligence — all while keeping 
                    sustainability at the forefront.
                  </p>
                  <p className="text-white/65 text-lg leading-relaxed">
                    From trend forecasting to supplier research, we're building the comprehensive 
                    platform that modern fashion businesses need to thrive.
                  </p>
                </div>
                
                {/* Stats */}
                <div className={cn(
                  "p-10 lg:p-12 rounded-[20px]",
                  "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                  "border border-white/[0.10]",
                  "shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
                )}>
                  <div className="space-y-10">
                    <div>
                      <p className="text-5xl lg:text-6xl font-luxury text-white/[0.92] mb-3">100+</p>
                      <p className="text-white/50">Fashion brands served</p>
                    </div>
                    <div className="border-t border-white/10 pt-10">
                      <p className="text-5xl lg:text-6xl font-luxury text-white/[0.92] mb-3">50K+</p>
                      <p className="text-white/50">Research tasks completed</p>
                    </div>
                    <div className="border-t border-white/10 pt-10">
                      <p className="text-5xl lg:text-6xl font-luxury text-white/[0.92] mb-3">85%</p>
                      <p className="text-white/50">Time saved on research</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 lg:py-32 bg-[#070707]">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
                  What Drives Us
                </p>
                <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92]">
                  Our Values
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {values.map((value, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-8 lg:p-10 rounded-[20px]",
                      "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                      "border border-white/[0.10]",
                      "hover:border-white/[0.18] transition-all"
                    )}
                  >
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-6">
                      <value.icon className="w-6 h-6 text-white/70" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-medium text-white/[0.92] mb-4">
                      {value.title}
                    </h3>
                    <p className="text-white/60 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-24 lg:py-32 bg-[#0A0A0A]">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Image */}
                <div className="relative rounded-[20px] overflow-hidden shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
                  <img 
                    src={sustainableImage} 
                    alt="Sustainable fashion materials" 
                    className="w-full aspect-[4/5] object-cover"
                    style={{
                      filter: 'grayscale(100%) contrast(1.05) brightness(0.9)'
                    }}
                  />
                </div>

                {/* Content */}
                <div className="lg:py-12">
                  <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
                    Our Vision
                  </p>
                  <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92] mb-8 leading-[1.1]">
                    A sustainable future for fashion
                  </h2>
                  <p className="text-white/65 text-lg leading-relaxed mb-8">
                    We envision a fashion industry where every decision is informed by intelligent 
                    data, where sustainability isn't an afterthought but a foundation, and where 
                    professionals can focus on creativity while AI handles the research heavy lifting.
                  </p>
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-[#141414] border border-white/[0.10]">
                    <Leaf className="w-5 h-5 text-white/60" />
                    <span className="text-white/80 font-medium">
                      Committed to net-zero by 2030
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 lg:py-40 bg-[#070707]">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92] mb-8 leading-[1.1]">
                Ready to transform your workflow?
              </h2>
              <p className="text-white/60 text-lg mb-12">
                Join leading fashion brands using McLeuker AI for smarter research.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="px-10 py-6 text-base bg-white text-black hover:bg-white/90" 
                  asChild
                >
                  <Link to="/signup">
                    Get Started Free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-10 py-6 text-base bg-[#141414] border-white/[0.10] text-white hover:bg-[#1A1A1A]" 
                  asChild
                >
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
