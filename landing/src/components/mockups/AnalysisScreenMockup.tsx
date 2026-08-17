// Mirrors a hand-analysis result card visually using app design tokens.
const colors = {
  bgPrimary: '#6A0B0B',
  bgShadow: '#3A0000',
  bgTertiary: '#7A1717',
  cream: '#F4E8D8',
  creamMuted: '#CCBBA8',
  gold: '#E8B84A',
  green: '#22C55E',
};

export function AnalysisScreenMockup() {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ backgroundColor: colors.bgPrimary }}
    >
      <div className="h-12" />

      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.bgShadow }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <span style={{ color: colors.cream, fontSize: 15, fontWeight: 600 }}>Hand Analysis</span>
        <div className="w-9 h-9" />
      </div>

      {/* Cards row */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <Card rank="A" suit="♠" red={false} />
        <Card rank="K" suit="♠" red={false} />
        <span style={{ color: colors.creamMuted, fontSize: 11, marginLeft: 6 }}>UTG · $5/$10</span>
      </div>

      {/* Verdict */}
      <div className="px-5 pb-3">
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.gold}40` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.green }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.bgShadow} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <span style={{ color: colors.cream, fontWeight: 700, fontSize: 14 }}>Solid play</span>
          </div>
          <p style={{ color: colors.creamMuted, fontSize: 12, lineHeight: '17px' }}>
            Opening AKs UTG to 3x is standard. You're ahead of villain's calling range and have strong post-flop equity.
          </p>
        </div>
      </div>

      {/* EV stat */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-2">
        <Stat label="Expected EV" value="+2.4 BB" highlight />
        <Stat label="Equity" value="68%" />
      </div>

      {/* Improvement */}
      <div className="px-5 pb-3">
        <p style={{ color: colors.creamMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          One thing to consider
        </p>
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <p style={{ color: colors.cream, fontSize: 12, lineHeight: '17px' }}>
            Against the BTN 3-bet, calling out of position is fine but folding the bottom of your range here would also be defensible.
          </p>
        </div>
      </div>

      <div className="flex-1" />

      {/* CTA */}
      <div className="px-5 pb-5">
        <div
          className="rounded-full py-3 text-center"
          style={{ backgroundColor: colors.gold }}
        >
          <span style={{ color: colors.bgShadow, fontWeight: 700, fontSize: 14 }}>Talk through another hand</span>
        </div>
      </div>

      <div className="flex justify-center pb-2">
        <div className="w-32 h-1 rounded-full" style={{ backgroundColor: colors.cream, opacity: 0.4 }} />
      </div>
    </div>
  );
}

function Card({ rank, suit, red }: { rank: string; suit: string; red: boolean }) {
  return (
    <div
      className="rounded-lg flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#F4E8D8',
        width: 42,
        height: 56,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ color: red ? '#C8102E' : '#1A1A1A', fontWeight: 800, fontSize: 16, lineHeight: '16px' }}>{rank}</span>
      <span style={{ color: red ? '#C8102E' : '#1A1A1A', fontSize: 18, lineHeight: '18px' }}>{suit}</span>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ backgroundColor: colors.bgTertiary }}
    >
      <p style={{ color: colors.creamMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</p>
      <p style={{ color: highlight ? colors.green : colors.cream, fontSize: 18, fontWeight: 700 }}>{value}</p>
    </div>
  );
}
