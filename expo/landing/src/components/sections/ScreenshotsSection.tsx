import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// Placeholder screenshots - replace with actual app screenshots
const screenshots = [
  {
    id: 1,
    title: 'Chat Interface',
    description: 'Natural conversation with your AI coach',
  },
  {
    id: 2,
    title: 'Voice Mode',
    description: 'Hands-free analysis while you play',
  },
  {
    id: 3,
    title: 'Hand History',
    description: 'Track and review all your hands',
  },
  {
    id: 4,
    title: 'Analysis Results',
    description: 'Detailed breakdowns with optimal plays',
  },
  {
    id: 5,
    title: 'Session Tracking',
    description: 'Organize hands by session',
  },
];

function ScreenshotCard({
  screenshot,
  index,
}: {
  screenshot: (typeof screenshots)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex-shrink-0 w-[260px] sm:w-[280px] group"
    >
      {/* Phone frame */}
      <div className="relative bg-surface-darkGray rounded-[2.5rem] p-2 shadow-xl group-hover:shadow-glow-red transition-shadow duration-300">
        <div className="relative bg-black rounded-[2rem] overflow-hidden aspect-[9/19.5]">
          {/* Dynamic island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-10" />

          {/* Placeholder screen */}
          <div className="w-full h-full bg-gradient-to-b from-brand-primary to-brand-shadow flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent-red/20 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-accent-red"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-text-ivory text-sm font-medium mb-1">
                {screenshot.title}
              </p>
              <p className="text-text-cream text-xs">{screenshot.description}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ScreenshotsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="glow-orb w-[500px] h-[500px] bg-accent-gold/5 top-0 left-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* Section header */}
        <ScrollReveal className="text-center mb-12 section-container">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-ivory mb-4">
            Designed for the Table
          </h2>
          <p className="text-text-cream text-lg max-w-2xl mx-auto">
            A beautiful, intuitive interface that gets out of your way so you can
            focus on winning.
          </p>
        </ScrollReveal>

        {/* Screenshots carousel */}
        <div className="relative">
          {/* Navigation buttons */}
          <button
            onClick={() => scroll('left')}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-surface-darkGray/80 backdrop-blur items-center justify-center text-text-ivory hover:bg-surface-darkGray transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-surface-darkGray/80 backdrop-blur items-center justify-center text-text-ivory hover:bg-surface-darkGray transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide px-4 sm:px-8 lg:px-16 py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Spacer for centering */}
            <div className="flex-shrink-0 w-4 sm:w-8 lg:w-16" />

            {screenshots.map((screenshot, index) => (
              <ScreenshotCard
                key={screenshot.id}
                screenshot={screenshot}
                index={index}
              />
            ))}

            {/* Spacer for centering */}
            <div className="flex-shrink-0 w-4 sm:w-8 lg:w-16" />
          </div>
        </div>

        {/* Note about screenshots */}
        <p className="text-center text-text-muted text-sm mt-8 section-container">
          Screenshots are placeholders. Replace with actual app screenshots in{' '}
          <code className="text-accent-red">/landing/public/assets/images/</code>
        </p>
      </div>
    </section>
  );
}
