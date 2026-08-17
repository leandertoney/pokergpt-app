import { motion } from 'framer-motion';

// Mirrors app/voice.tsx visually using the app's real color tokens.
const colors = {
  bgPrimary: '#6A0B0B',
  bgShadow: '#3A0000',
  cream: '#F4E8D8',
  creamMuted: '#CCBBA8',
  gold: '#E8B84A',
  red: '#FF3A3A',
};

export function VoiceScreenMockup() {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ backgroundColor: colors.bgPrimary }}
    >
      {/* Status bar spacer */}
      <div className="h-12" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.bgShadow }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <span style={{ color: colors.cream, fontSize: 15, fontWeight: 600 }}>Voice Coach</span>
        <div className="w-9 h-9" />
      </div>

      {/* Conversation */}
      <div className="flex-1 px-5 py-4 space-y-3 overflow-hidden">
        {/* User bubble */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="self-end ml-auto px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%]"
          style={{ backgroundColor: colors.gold, alignSelf: 'flex-end', marginLeft: 'auto', width: 'fit-content' }}
        >
          <p style={{ color: colors.bgShadow, fontSize: 13, lineHeight: '18px' }}>
            Got AK suited UTG, opened to $15.
          </p>
        </motion.div>

        {/* AI bubble */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]"
          style={{ backgroundColor: colors.bgShadow, width: 'fit-content' }}
        >
          <p style={{ color: colors.cream, fontSize: 13, lineHeight: '18px' }}>
            Solid open. AKs UTG is one of the strongest hands. Did anyone 3-bet?
          </p>
        </motion.div>

        {/* User typing/speaking indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="self-end ml-auto px-4 py-2.5 rounded-2xl rounded-br-md"
          style={{ backgroundColor: colors.gold, opacity: 0.5, alignSelf: 'flex-end', marginLeft: 'auto', width: 'fit-content' }}
        >
          <p style={{ color: colors.bgShadow, fontSize: 13 }}>
            Yeah, button 3-bet to forty…
          </p>
        </motion.div>
      </div>

      {/* Voice waveform area */}
      <div className="px-5 pb-2 flex flex-col items-center gap-3">
        <WaveformBars />
        <span style={{ color: colors.creamMuted, fontSize: 11 }}>Listening…</span>
      </div>

      {/* Speak button */}
      <div className="px-5 pb-8 flex justify-center">
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0 0 ${colors.gold}66`,
              `0 0 0 16px ${colors.gold}00`,
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.gold }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill={colors.bgShadow}>
            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
            <path d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V20H8a1 1 0 000 2h8a1 1 0 000-2h-3v-2.08A7 7 0 0019 11z" />
          </svg>
        </motion.div>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2">
        <div className="w-32 h-1 rounded-full" style={{ backgroundColor: colors.cream, opacity: 0.4 }} />
      </div>
    </div>
  );
}

function WaveformBars() {
  return (
    <div className="flex items-center gap-1.5 h-10">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: colors.gold }}
          animate={{
            height: ['20%', '90%', '20%'],
          }}
          transition={{
            duration: 0.8 + i * 0.05,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
