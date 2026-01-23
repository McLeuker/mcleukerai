import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileText, Table, Presentation } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const examplePrompts = [
    "Create a supplier shortlist for sustainable denim in Europe and export Excel + PDF",
    "Analyze current athleisure trends for Fall/Winter 2025 collection planning",
    "Research ethical sourcing options for organic cotton suppliers in Asia",
    "Generate a competitive analysis of luxury handbag brands in the US market",
  ];

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-sm flex items-center justify-center">
              <span className="text-background font-semibold text-sm">F</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">Fashion AI</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button variant="default" size="sm" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">AI-powered fashion intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground mb-6 text-balance animate-fade-in">
            Your AI fashion analyst, researcher, and operator.
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto text-balance animate-fade-in">
            From one prompt to finished reports, sourcing sheets, and decks.
          </p>

          {/* Main Input */}
          <form onSubmit={handleSubmit} className="mb-8 animate-fade-in">
            <div className="relative max-w-2xl mx-auto">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your task in natural language..."
                className="w-full h-32 px-5 py-4 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none shadow-premium text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!prompt.trim()}
                className="absolute bottom-4 right-4 gap-2"
              >
                Execute <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Example prompts */}
          <div className="max-w-2xl mx-auto animate-fade-in">
            <p className="text-sm text-muted-foreground mb-3">Try an example:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {examplePrompts.slice(0, 2).map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="px-3 py-1.5 text-sm text-muted-foreground bg-secondary hover:bg-accent rounded-md border border-border transition-colors text-left"
                >
                  "{example.slice(0, 50)}..."
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto max-w-5xl mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Real deliverables, not just conversation
            </h2>
            <p className="text-lg text-muted-foreground">
              Fashion AI executes complex tasks end-to-end and generates professional outputs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "PDF Reports",
                description: "Comprehensive analyses, trend reports, and executive summaries ready for presentation.",
              },
              {
                icon: Table,
                title: "Excel Exports",
                description: "Structured data sheets, supplier lists, and cost analyses in spreadsheet format.",
              },
              {
                icon: Presentation,
                title: "Slide Decks",
                description: "Professional presentations for internal reviews and client meetings.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-lg bg-card border border-border shadow-premium"
              >
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="container mx-auto max-w-4xl mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Built for fashion professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Supplier research and sourcing",
              "Market analysis and trends",
              "Sustainability assessments",
              "Competitive intelligence",
              "Collection planning",
              "Cost analysis and budgeting",
              "Brand positioning",
              "Merchandising strategies",
            ].map((useCase, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-md bg-card border border-border"
              >
                <div className="w-2 h-2 rounded-full bg-foreground" />
                <span className="text-foreground">{useCase}</span>
              </div>
            ))}
          </div>
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

export default Landing;
