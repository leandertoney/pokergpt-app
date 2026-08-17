// Mirrors app/index.tsx visually using the app's real design tokens.
const colors = {
  bgPrimary: '#6A0B0B',
  bgShadow: '#3A0000',
  bgTertiary: '#7A1717',
  cream: '#F4E8D8',
  creamMuted: '#CCBBA8',
  gold: '#E8B84A',
};

export function HomeScreenMockup() {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ backgroundColor: colors.bgPrimary }}
    >
      <div className="h-12" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.gold }}
          >
            <span style={{ color: colors.bgShadow, fontWeight: 800, fontSize: 14 }}>P</span>
          </div>
          <span style={{ color: colors.cream, fontWeight: 700, fontSize: 17 }}>PokerPro AI</span>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.bgShadow }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-5 pb-4">
        <h2 style={{ color: colors.cream, fontSize: 22, fontWeight: 700, lineHeight: '28px' }}>
          What hand are we<br />talking through today?
        </h2>
      </div>

      {/* Today's review card */}
      <div className="px-5 pb-3">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: colors.gold }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.bgShadow }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="flex-1">
            <p style={{ color: colors.bgShadow, fontWeight: 700, fontSize: 13 }}>Daily Review</p>
            <p style={{ color: colors.bgShadow, fontSize: 11, opacity: 0.75 }}>3 hands ready to study</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.bgShadow} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      {/* Recent hands list */}
      <div className="flex-1 px-5 space-y-2 overflow-hidden">
        {[
          { hand: 'AKs', pos: 'UTG', result: '+$120', color: '#22C55E' },
          { hand: 'JJ', pos: 'BTN', result: '-$85', color: '#EF4444' },
          { hand: 'QQ', pos: 'CO', result: '+$310', color: '#22C55E' },
        ].map((h, i) => (
          <div
            key={i}
            className="rounded-xl px-3 py-2.5 flex items-center justify-between"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="px-2 py-0.5 rounded-md"
                style={{ backgroundColor: colors.cream }}
              >
                <span style={{ color: colors.bgShadow, fontWeight: 700, fontSize: 12 }}>{h.hand}</span>
              </div>
              <span style={{ color: colors.cream, fontSize: 12, opacity: 0.8 }}>{h.pos}</span>
            </div>
            <span style={{ color: h.color, fontWeight: 700, fontSize: 13 }}>{h.result}</span>
          </div>
        ))}
      </div>

      {/* Search bar with speak button */}
      <div className="px-5 pt-3 pb-2">
        <div
          className="rounded-full pl-4 pr-1 py-1 flex items-center gap-2"
          style={{ backgroundColor: colors.bgTertiary, height: 48 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.creamMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span style={{ color: colors.creamMuted, fontSize: 13, flex: 1 }}>
            Search or tap Speak
          </span>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.gold }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={colors.bgShadow}>
              <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
              <path d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V20H8a1 1 0 000 2h8a1 1 0 000-2h-3v-2.08A7 7 0 0019 11z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex justify-center pb-2">
        <div className="w-32 h-1 rounded-full" style={{ backgroundColor: colors.cream, opacity: 0.4 }} />
      </div>
    </div>
  );
}
