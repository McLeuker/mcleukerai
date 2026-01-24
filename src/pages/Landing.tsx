import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Table, Presentation, Sparkles, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
const Landing = () => {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      if (user) {
        navigate("/dashboard", {
          state: {
            initialPrompt: prompt
          }
        });
      } else {
        navigate("/login", {
          state: {
            redirectPrompt: prompt
          }
        });
      }
    }
  };
  const examplePrompts = ["Create a supplier shortlist for sustainable denim in Europe", "Analyze SS26 womenswear color trends from Milan and Paris", "Map clean beauty certifications across European markets", "Research AI adoption in fashion supply chain management"];
  const useCases = [{
    sector: "Fashion",
    examples: ["Trend forecasting", "Supplier research", "Collection planning"]
  }, {
    sector: "Beauty",
    examples: ["Ingredient analysis", "Market mapping", "Brand positioning"]
  }, {
    sector: "Sustainability",
    examples: ["Certification audits", "Impact assessments", "Supply chain transparency"]
  }, {
    sector: "Fashion Tech",
    examples: ["Technology scouting", "Innovation reports", "Competitive analysis"]
  }];
  return <div className="min-h-screen gradient-editorial">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <span className="font-medium text-sm tracking-tight">McLeuker AI</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Pricing
            </Link>
            {user ? <Button size="sm" asChild>
                <Link to="/dashboard">
                  Go to workspace
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button> : <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </>}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              Fashion Intelligence Platform
            </span>
          </div>

          {/* Headline - Editorial Serif */}
          <h1 className="font-editorial text-5xl md:text-6xl lg:text-7xl text-foreground mb-6 text-balance animate-fade-in leading-[1.1]">
            Your AI fashion analyst, researcher, and operator.
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto text-balance animate-fade-in">
            From a single prompt to finished reports, sourcing sheets, and presentation decks.
            Built for fashion professionals who need real deliverables.
          </p>

          {/* Main Input */}
          <form onSubmit={handleSubmit} className="mb-6 animate-fade-in-up">
            <div className="relative max-w-2xl mx-auto">
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your research task..." className="w-full h-28 px-5 py-4 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none shadow-elevated text-base" onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }} />
              <Button type="submit" disabled={!prompt.trim()} className="absolute bottom-4 right-4 gap-2">
                Run task <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Example prompts */}
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Try an example</p>
            <div className="flex flex-wrap justify-center gap-2">
              {examplePrompts.map((example, i) => <button key={i} onClick={() => setPrompt(example)} className="px-3 py-1.5 text-xs text-muted-foreground bg-card hover:bg-secondary rounded-md border border-border transition-colors">
                  {example}
                </button>)}
            </div>
          </div>
        </div>

        {/* Deliverables Section */}
        <div className="container mx-auto max-w-5xl mt-32">
          <div className="text-center mb-12">
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground mb-4">
              Real deliverables, not conversation
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Fashion AI executes complex research tasks end-to-end and generates
              professional outputs ready for your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[{
            icon: FileText,
            title: "PDF Reports",
            description: "Comprehensive analyses, trend reports, and executive summaries with citations."
          }, {
            icon: Table,
            title: "Excel Exports",
            description: "Structured data sheets, supplier lists, and cost analyses in spreadsheet format."
          }, {
            icon: Presentation,
            title: "Slide Decks",
            description: "Professional presentations for internal reviews and client meetings."
          }].map((feature, i) => <div key={i} className="p-6 rounded-lg bg-card border border-border shadow-premium group hover:shadow-elevated transition-shadow">
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                  <feature.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>)}
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="container mx-auto max-w-5xl mt-32">
          <div className="text-center mb-12">
            <h2 className="font-editorial text-3xl md:text-4xl text-foreground mb-4">
              Built for fashion professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {useCases.map((category, i) => <div key={i} className="p-5 rounded-lg bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {category.sector}
                </p>
                <div className="flex flex-wrap gap-2">
                  {category.examples.map((example, j) => <span key={j} className="px-3 py-1.5 bg-secondary text-sm text-foreground rounded-md">
                      {example}
                    </span>)}
                </div>
              </div>)}
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto max-w-2xl mt-32 text-center">
          <h2 className="font-editorial text-3xl text-foreground mb-4">
            Replace research decks and junior analysts
          </h2>
          <p className="text-muted-foreground mb-8">
            Start executing real fashion intelligence tasks in minutes.
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Fashion AI. Professional intelligence for the fashion industry.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;