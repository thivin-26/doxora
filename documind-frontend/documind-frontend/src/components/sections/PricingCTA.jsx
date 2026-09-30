import { Link } from "react-router-dom";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import Button from "../Button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    desc: "Try every feature with light usage.",
    features: ["5 documents / month", "Standard summaries", "Chat with memory", "DOCX & TXT export"],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    desc: "For freelancers and small teams.",
    features: [
      "Unlimited documents",
      "All summary styles",
      "Structured extraction (JSON/CSV)",
      "Document generation",
      "Priority processing",
    ],
    cta: "Get started",
    highlighted: true,
  },
  {
    name: "Team",
    price: "Custom",
    desc: "Shared workspaces and admin controls.",
    features: ["Everything in Pro", "Shared document library", "Role-based access", "Priority support"],
    cta: "Contact us",
    highlighted: false,
  },
];

export default function PricingCTA() {
  return (
    <section id="pricing" className="relative px-5 sm:px-8 py-28 overflow-hidden">
      {/* Background ambient orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[450px] w-[800px] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none animate-pulse-glow" />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-xl mb-14 mx-auto text-center reveal-on-scroll">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-[0.25em] mb-3">
            ROYAL MEMBERSHIP
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Simple pricing that scales with you
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((t, i) => (
            <div
              key={t.name}
              className={`rounded-2xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-2.5 reveal-on-scroll ${
                t.highlighted
                  ? "border border-amber-400/60 bg-gradient-to-b from-amber-500/15 via-ink-800/80 to-ink-900/90 shadow-[0_0_40px_rgba(230,184,59,0.25)] scale-[1.03] relative z-10 hover-wiggle"
                  : "border border-white/10 bg-ink-800/50 backdrop-blur-md shadow-[var(--shadow-card)] hover:border-amber-400/40 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover-shake"
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {t.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3.5 py-0.5 text-[11px] font-bold text-ink-950 shadow-md animate-wiggle uppercase tracking-wider">
                  <Sparkles size={11} /> MOST POPULAR
                </div>
              )}
              <h3 className="font-display text-lg text-white mb-1 font-semibold">{t.name}</h3>
              <p className="text-sm text-ink-400 mb-5">{t.desc}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-gold-royal">
                  {t.price}
                </span>
                {t.period && <span className="text-ink-400 text-sm">{t.period}</span>}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-200">
                    <Check size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                as={Link}
                to="/login?mode=signup"
                variant={t.highlighted ? "primary" : "secondary"}
                className={`w-full ${t.highlighted ? "shadow-[0_0_30px_rgba(230,184,59,0.5)] border border-amber-300/40 hover-shake" : "hover-wiggle"}`}
              >
                {t.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-24 rounded-3xl border border-amber-400/25 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-12 text-center relative overflow-hidden group shadow-2xl reveal-on-scroll">
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-amber-500/15 blur-[120px] animate-pulse-glow" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-gold-royal tracking-wide mb-4 uppercase">
              Enter the Sovereign Realm of Doxora
            </h2>
            <p className="text-ink-400 max-w-lg mx-auto mb-8 text-base">
              Create your account and experience the pinnacle of AI document intelligence in under a minute.
            </p>
            <Button size="lg" as={Link} to="/login?mode=signup" className="group shadow-[0_0_35px_rgba(230,184,59,0.6)] hover-shake border border-amber-300/40">
              Create free account <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

