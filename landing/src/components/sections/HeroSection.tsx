import { motion } from 'framer-motion';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { QRCode } from '@/components/ui/QRCode';
import { PhoneMockup } from '@/components/ui/PhoneMockup';
import { CONFIG } from '@/constants/config';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-gradient-to-b from-surface-black via-surface-black to-brand-shadow/50">
      {/* Background glow orbs */}
      <div className="glow-orb w-[500px] h-[500px] bg-accent-red/10 top-1/4 -left-64" />
      <div className="glow-orb w-[400px] h-[400px] bg-accent-gold/10 bottom-1/4 -right-48" />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-red/10 border border-accent-red/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
              <span className="text-accent-red text-sm font-medium">
                AI-Powered Poker Coaching
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-ivory mb-6 leading-tight"
            >
              {CONFIG.appName}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl sm:text-2xl text-text-cream mb-4"
            >
              {CONFIG.tagline}
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-text-muted text-lg mb-8 max-w-lg mx-auto lg:mx-0"
            >
              Master live poker with instant AI analysis. Voice-powered coaching,
              GTO strategy, and personalized advice - all in your pocket.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start"
            >
              <AppStoreBadge />

              {/* QR Code - Desktop only */}
              <div className="hidden lg:flex items-center gap-3">
                <QRCode size={80} />
                <div className="text-left">
                  <p className="text-text-muted text-xs">Scan to</p>
                  <p className="text-text-ivory text-sm font-medium">Download</p>
                </div>
              </div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-10 flex items-center gap-4 justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-red/80 to-accent-gold/80 border-2 border-surface-black"
                  />
                ))}
              </div>
              <p className="text-text-muted text-sm">
                <span className="text-text-ivory font-semibold">10,000+</span> players improving daily
              </p>
            </motion.div>
          </motion.div>

          {/* Right content - Phone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-text-muted text-xs">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-text-muted/30 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-text-muted rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
