import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { HowItWorksSection } from '@/components/sections/HowItWorksSection';
import { InteractiveDemoSection } from '@/components/sections/InteractiveDemoSection';
import { ScreenshotsSection } from '@/components/sections/ScreenshotsSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { TrustSection } from '@/components/sections/TrustSection';
import { CTASection } from '@/components/sections/CTASection';

export default function App() {
  return (
    <div className="min-h-screen bg-surface-black">
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <InteractiveDemoSection />
        <ScreenshotsSection />
        <FeaturesSection />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
