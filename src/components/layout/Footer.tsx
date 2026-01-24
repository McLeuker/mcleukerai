import { Link } from "react-router-dom";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const navigation = {
    product: [
      { name: "Workspace", href: "/dashboard" },
      { name: "Solutions", href: "/services" },
      { name: "Pricing", href: "/pricing" },
    ],
    company: [
      { name: "About", href: "/about" },
      { name: "Contact", href: "/contact" },
    ],
    legal: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
    ],
  };

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img
                src={mcleukerLogo}
                alt="McLeuker AI"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-sm mb-6">
              AI & Sustainability for Fashion. Research, analyze, and execute 
              complex tasks with real deliverables.
            </p>
            <a
              href="mailto:contact@mcleuker.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors link-underline"
            >
              contact@mcleuker.com
            </a>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-6 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-4">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-6 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-4">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-6 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-4">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} McLeuker AI. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}