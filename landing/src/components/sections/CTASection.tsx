import { motion } from 'framer-motion';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { QRCode } from '@/components/ui/QRCode';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient - the one place we go bold with red */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-black via-brand-shadow/80 to-surface-black" />

      {/* Glow orbs */}
      <div className="glow-orb w-[600px] h-[600px] bg-accent-red/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="section-container relative z-10">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center">
            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-ivory mb-6"
            >
              Ready to Level Up Your Game?
            </motion.h2>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-text-cream text-lg sm:text-xl mb-10 max-w-xl mx-auto"
            >
              Download now and get{' '}
              <span className="text-accent-gold font-semibold">
                5 free hand analyses
              </span>
              . Your edge at the table is one tap away.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8"
            >
              <AppStoreBadge className="shadow-glow-red" />

              {/* QR Code */}
              <div className="flex items-center gap-4">
                <QRCode size={100} />
                <div className="text-left hidden sm:block">
                  <p className="text-text-muted text-sm">Scan with your</p>
                  <p className="text-text-ivory font-medium">phone camera</p>
                </div>
              </div>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-text-muted text-sm"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-accent-gold"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>4.9 App Store Rating</span>
              </div>
              <span className="hidden sm:inline text-text-muted/30">|</span>
              <span>Free to download</span>
              <span className="hidden sm:inline text-text-muted/30">|</span>
              <span>No credit card required</span>
            </motion.div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
