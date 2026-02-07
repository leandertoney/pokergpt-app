import {
  Mic,
  Brain,
  Flame,
  Zap,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const features = [
  {
    icon: Mic,
    title: 'Voice-First Input',
    description:
      "Describe hands naturally like you're at the table. No typing needed - just talk to your coach.",
    accent: 'gold',
  },
  {
    icon: Brain,
    title: 'Hybrid GTO + Exploit',
    description:
      'Get mathematically optimal plays adjusted for real-world villain tendencies and table dynamics.',
    accent: 'red',
  },
  {
    icon: Flame,
    title: 'Direct, Opinionated Advice',
    description:
      "No wishy-washy analysis. We tell you what WE would do in your exact spot - like a pro friend.",
    accent: 'red',
  },
  {
    icon: Zap,
    title: 'Instant Analysis',
    description:
      'Real-time responses powered by cutting-edge AI. Get your answer before the next hand is dealt.',
    accent: 'gold',
  },
  {
    icon: Clock,
    title: 'Hand History',
    description:
      'Save hands, track patterns, and review your key spots. Build your own personal study library.',
    accent: 'red',
  },
  {
    icon: MessageCircle,
    title: 'Natural Conversation',
    description:
      'No complicated forms or inputs. Just describe the hand like you would to a friend.',
    accent: 'gold',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative bg-surface-darkGray/30">
      {/* Background accent */}
      <div className="glow-orb w-[600px] h-[600px] bg-accent-gold/5 top-1/2 -translate-y-1/2 -right-64" />

      <div className="section-container relative z-10">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-ivory mb-4">
            Everything You Need to Win
          </h2>
          <p className="text-text-cream text-lg max-w-2xl mx-auto">
            Powerful features designed by poker players, for poker players.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 0.1}>
              <div className={`card h-full transition-all duration-300 group ${feature.accent === 'gold' ? 'hover:border-accent-gold/30' : 'hover:border-accent-red/30'}`}>
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${
                    feature.accent === 'gold'
                      ? 'bg-accent-gold/10 group-hover:bg-accent-gold/20'
                      : 'bg-accent-red/10 group-hover:bg-accent-red/20'
                  }`}
                >
                  <feature.icon
                    className={`w-6 h-6 ${
                      feature.accent === 'gold'
                        ? 'text-accent-gold'
                        : 'text-accent-red'
                    }`}
                  />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-text-ivory mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-cream text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Accent line */}
                <div
                  className={`h-0.5 w-12 mt-4 rounded-full ${
                    feature.accent === 'gold' ? 'bg-accent-gold/50' : 'bg-accent-red/50'
                  }`}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
