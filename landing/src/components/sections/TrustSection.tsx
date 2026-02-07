import { ScrollReveal } from '@/components/ui/ScrollReveal';

// Partner logos - using text placeholders that can be replaced with SVGs
const partners = [
  {
    name: 'OpenAI',
    logo: (
      <svg className="h-8 w-auto" viewBox="0 0 120 30" fill="currentColor">
        <text
          x="0"
          y="22"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="20"
          fontWeight="600"
        >
          OpenAI
        </text>
      </svg>
    ),
  },
  {
    name: 'Anthropic',
    logo: (
      <svg className="h-8 w-auto" viewBox="0 0 120 30" fill="currentColor">
        <text
          x="0"
          y="22"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="20"
          fontWeight="600"
        >
          Anthropic
        </text>
      </svg>
    ),
  },
];

export function TrustSection() {
  return (
    <section className="py-16 border-y border-white/5">
      <div className="section-container">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-text-muted text-sm uppercase tracking-wider mb-8">
              Powered by
            </p>

            <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16">
              {partners.map((partner) => (
                <div
                  key={partner.name}
                  className="text-text-muted/50 hover:text-text-ivory transition-colors duration-300"
                  title={partner.name}
                >
                  {partner.logo}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
