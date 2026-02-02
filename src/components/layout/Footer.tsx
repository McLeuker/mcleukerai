import { Link } from "react-router-dom";
import mcleukerLogo from "@/assets/mcleuker-logo.png";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.08] bg-gradient-to-b from-[#0A0A0A] to-[#070707] mt-auto">
      <div className="container mx-auto px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={mcleukerLogo}
              alt="McLeuker AI"
              className="h-7 w-auto"
            />
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-6 lg:gap-8">
            <Link
              to="/about"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              About
            </Link>
            <Link
              to="/services"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Solutions
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-white/[0.42]">
            © {currentYear} McLeuker AI
          </p>
        </div>
      </div>
    </footer>
  );
}
