import { cn } from '@/lib/utils';

interface PhoneMockupProps {
  children?: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function PhoneMockup({
  children,
  className = '',
  animate = true,
}: PhoneMockupProps) {
  return (
    <div
      className={cn(
        'relative',
        animate && 'animate-float',
        className
      )}
    >
      {/* Phone frame */}
      <div className="relative w-[280px] sm:w-[320px] h-[560px] sm:h-[640px] bg-surface-darkGray rounded-[3rem] p-2 shadow-2xl">
        {/* Inner bezel */}
        <div className="relative w-full h-full bg-black rounded-[2.5rem] overflow-hidden">
          {/* Dynamic island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-10" />

          {/* Screen content */}
          <div className="w-full h-full">
            {children || (
              <div className="w-full h-full bg-gradient-to-b from-brand-primary to-brand-shadow flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-red/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-accent-red"
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
                  <p className="text-text-cream text-sm">
                    Your screenshot here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-4 bg-accent-red/10 blur-3xl rounded-full -z-10" />
    </div>
  );
}
