export default function FlipCard({ icon: Icon, title, front, back }) {
  return (
    <div className="card-flip-scene h-64 w-full group cursor-pointer" tabIndex={0}>
      <div className="card-flip-inner relative h-full w-full">
        {/* Front */}
        <div className="card-flip-face absolute inset-0 rounded-2xl border border-white/10 bg-ink-800/60 backdrop-blur-md p-6 flex flex-col justify-between shadow-[var(--shadow-card)] transition-all duration-300 group-hover:border-brand-400/40 group-hover:shadow-[0_10px_30px_rgba(124,92,255,0.2)]">
          <div className="h-11 w-11 rounded-xl bg-brand-500/15 border border-brand-400/30 flex items-center justify-center text-brand-400 transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-500/25">
            {Icon && <Icon size={22} strokeWidth={1.75} className="transition-transform duration-300 group-hover:rotate-6" />}
          </div>
          <div>
            <h3 className="font-display text-lg text-white mb-1.5 flex items-center justify-between">
              {title}
              <span className="text-xs text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">Hover →</span>
            </h3>
            <p className="text-sm text-ink-400 leading-relaxed">{front}</p>
          </div>
        </div>
        {/* Back */}
        <div className="card-flip-face card-flip-back absolute inset-0 rounded-2xl border border-brand-400/50 bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 p-6 flex flex-col justify-center shadow-[var(--shadow-glow)]">
          <h3 className="font-display text-lg text-white mb-2 font-semibold">{title}</h3>
          <p className="text-sm text-white/90 leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  );
}

