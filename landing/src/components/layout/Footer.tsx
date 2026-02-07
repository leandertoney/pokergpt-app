import { CONFIG } from '@/constants/config';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface-black border-t border-white/5 py-8">
      <div className="section-container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/logo.png"
              alt={CONFIG.appName}
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-text-muted text-sm">
              © {currentYear} {CONFIG.appName}. All rights reserved.
            </span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <a
              href={CONFIG.legalLinks.terms}
              className="text-text-muted hover:text-text-ivory transition-colors"
            >
              Terms
            </a>
            <a
              href={CONFIG.legalLinks.privacy}
              className="text-text-muted hover:text-text-ivory transition-colors"
            >
              Privacy
            </a>
            <a
              href={CONFIG.legalLinks.contact}
              className="text-text-muted hover:text-text-ivory transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
