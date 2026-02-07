import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { Button } from '@/components/ui/Button';
import { CONFIG } from '@/constants/config';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Demo', href: '#demo' },
];

export function Header() {
  const { isScrolled } = useScrollPosition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-surface-black/95 backdrop-blur-lg border-b border-white/5'
          : 'bg-transparent'
      )}
    >
      <div className="section-container">
        <nav className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <img
              src="/assets/images/logo.png"
              alt={CONFIG.appName}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl"
            />
            <span className="font-bold text-lg sm:text-xl text-text-ivory">
              {CONFIG.appName}
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-cream hover:text-text-ivory transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
            <a href={CONFIG.appStoreUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm">Download</Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-ivory"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block py-3 text-text-cream hover:text-text-ivory transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={CONFIG.appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4"
            >
              <Button className="w-full">Download</Button>
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
