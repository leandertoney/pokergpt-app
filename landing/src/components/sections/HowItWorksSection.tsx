import { Mic, Brain, Trophy } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const steps = [
  {
    icon: Mic,
    number: '01',
    title: 'Describe Your Hand',
    description:
      "Tell the AI about your hand naturally - just like you'd tell a friend at the table. Voice or text, your choice.",
  },
  {
    icon: Brain,
    number: '02',
    title: 'AI Breaks It Down',
    description:
      'Get instant analysis: pot odds, optimal sizing, range considerations, and the mathematically correct play.',
  },
  {
    icon: Trophy,
    number: '03',
    title: 'Master Every Spot',
    description:
      'Save hands to your history, track patterns in your game, and watch your win rate climb.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 relative bg-surface-darkGray/30">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-shadow/30 via-transparent to-brand-shadow/30" />

      <div className="section-container relative z-10">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-ivory mb-4">
            How It Works
          </h2>
          <p className="text-text-cream text-lg max-w-2xl mx-auto">
            Get expert poker analysis in three simple steps. No complicated setup,
            no learning curve.
          </p>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line - desktop only */}
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-transparent via-accent-red/30 to-transparent" />

          {steps.map((step, index) => (
            <ScrollReveal key={step.number} delay={index * 0.15}>
              <div className="relative group">
                {/* Step card */}
                <div className="card hover:border-accent-red/30 transition-all duration-300 text-center">
                  {/* Icon */}
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center group-hover:bg-accent-red/20 transition-colors">
                    <step.icon className="w-8 h-8 text-accent-red" />
                  </div>

                  {/* Number badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-red rounded-full">
                    <span className="text-xs font-bold text-white">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-text-ivory mb-3">
                    {step.title}
                  </h3>
                  <p className="text-text-cream text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
