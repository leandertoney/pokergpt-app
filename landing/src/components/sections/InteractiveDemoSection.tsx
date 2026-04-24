import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TypewriterText } from '@/components/ui/TypewriterText';

const demoScenarios = [
  {
    user: "I had pocket 7s from middle position, raised to $15. Three callers. Flop came K-7-2 rainbow.",
    ai: "You flopped a set of 7s - that's the dream. With three callers on a dry board, you've got the nuts right now. Bet around 2/3 pot to build value. Don't slow play here - charge those top pair hands.",
  },
  {
    user: "He bet 2/3 pot on the river with a flush completing. Should I call with two pair?",
    ai: "Pot odds of ~2.5:1 means you need 28% equity to call. Two pair is strong, but that flush completing changes everything. Against a tight villain, this is a fold. Against someone who bluffs rivers? Call it down.",
  },
  {
    user: "I flopped a flush draw in a 3-bet pot. Villain c-bets big.",
    ai: "Flush draw = 9 outs, roughly 35% equity by the river. In a 3-bet pot, you're getting great implied odds. Options: call and reassess turn, or raise as a semi-bluff if villain folds to aggression. What's your read?",
  },
];

export function InteractiveDemoSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAI, setShowAI] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    // Show AI response after user message
    const aiTimer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setShowAI(true);
      }, 1500);
    }, 500);

    return () => clearTimeout(aiTimer);
  }, [currentIndex]);

  useEffect(() => {
    if (typingComplete) {
      // Move to next scenario after delay
      const nextTimer = setTimeout(() => {
        setShowAI(false);
        setTypingComplete(false);
        setCurrentIndex((prev) => (prev + 1) % demoScenarios.length);
      }, 4000);

      return () => clearTimeout(nextTimer);
    }
  }, [typingComplete]);

  const currentScenario = demoScenarios[currentIndex];

  return (
    <section id="demo" className="py-24 relative bg-surface-darkGray/20">
      <div className="section-container">
        {/* Section header */}
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-ivory mb-4">
            See It In Action
          </h2>
          <p className="text-text-cream text-lg max-w-2xl mx-auto">
            Watch how PokerPro AI analyzes real poker hands and delivers expert advice
            in seconds.
          </p>
        </ScrollReveal>

        {/* Demo container */}
        <ScrollReveal delay={0.2}>
          <div className="max-w-3xl mx-auto">
            <div className="card p-0 overflow-hidden">
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-red animate-pulse" />
                <span className="text-text-ivory font-medium">PokerPro AI</span>
                <span className="text-text-muted text-sm ml-auto">Live Demo</span>
              </div>

              {/* Chat messages */}
              <div className="p-6 min-h-[300px] space-y-6">
                {/* User message */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`user-${currentIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-text-ivory" />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-muted text-xs mb-1">You</p>
                      <div className="bg-brand-secondary/50 rounded-2xl rounded-tl-none px-4 py-3">
                        <p className="text-text-ivory text-sm">
                          {currentScenario.user}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-accent-red" />
                      </div>
                      <div className="flex items-center gap-1 px-4 py-3">
                        <span
                          className="w-2 h-2 rounded-full bg-accent-red animate-typing-dot"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-accent-red animate-typing-dot"
                          style={{ animationDelay: '200ms' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-accent-red animate-typing-dot"
                          style={{ animationDelay: '400ms' }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI response */}
                <AnimatePresence>
                  {showAI && (
                    <motion.div
                      key={`ai-${currentIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-accent-red" />
                      </div>
                      <div className="flex-1">
                        <p className="text-accent-red text-xs mb-1">PokerPro AI</p>
                        <div className="bg-gradient-to-br from-brand-secondary/30 to-brand-shadow/30 border border-accent-red/10 rounded-2xl rounded-tl-none px-4 py-3">
                          <p className="text-text-ivory text-sm leading-relaxed">
                            <TypewriterText
                              text={currentScenario.ai}
                              speed={20}
                              onComplete={() => setTypingComplete(true)}
                            />
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="px-6 py-4 border-t border-white/5 flex justify-center gap-2">
                {demoScenarios.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setShowAI(false);
                      setTypingComplete(false);
                      setCurrentIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-accent-red w-6'
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
