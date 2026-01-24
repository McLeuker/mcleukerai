import { Link } from "react-router-dom";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img
                src={mcleukerLogo}
                alt="McLeuker AI"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Professional AI-powered fashion intelligence platform. 
              Research, analyze, and execute complex tasks with real deliverables.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Workspace
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  API Access <span className="text-xs">(Coming Soon)</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Use Cases Column */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Use Cases
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-muted-foreground">
                  Trend Forecasting
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Supplier Research
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Market Analysis
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">
                  Sustainability Reports
                </span>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contact@mcleukerai.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} McLeuker AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
