import { Upload, Wand2, Download, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload your file",
    desc: "Drop in a PDF, DOCX, TXT, or Markdown file. Parsing happens instantly, no setup required.",
  },
  {
    icon: Wand2,
    title: "Pick an action",
    desc: "Summarize it, ask it questions, extract structured data, or generate a brand-new document from it.",
  },
  {
    icon: Download,
    title: "Export the result",
    desc: "Download as DOCX, PDF, JSON, or CSV — or keep chatting to refine the answer.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-5 sm:px-8 py-28 bg-ink-900/40 border-y border-white/5 overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-brand-500/10 blur-[130px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-xl mb-16 reveal-on-scroll">
          <p className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-ping" />
            How it works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Three steps from raw file to real answer
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Animated Connecting Gradient Line */}
          <div className="hidden md:block absolute top-6 left-[16.5%] right-[16.5%] h-0.5 bg-gradient-to-r from-brand-500/20 via-brand-400 to-accent-400/20" />

          {steps.map((s, i) => (
            <div key={s.title} className="relative group p-6 rounded-2xl bg-ink-800/30 border border-white/5 hover:border-brand-400/30 transition-all duration-300 hover:-translate-y-1 hover:bg-ink-800/60 reveal-on-scroll hover-shake" style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="h-12 w-12 rounded-full bg-ink-800 border border-white/10 flex items-center justify-center text-brand-400 mb-6 relative z-10 group-hover:scale-110 group-hover:border-brand-400/60 group-hover:bg-brand-500/20 group-hover:text-white transition-all duration-300 shadow-md">
                <s.icon size={20} strokeWidth={1.75} className="transition-transform duration-300 group-hover:rotate-12" />
              </div>
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Step {i + 1}
              </p>
              <h3 className="font-display text-lg text-white mb-2 font-semibold group-hover:text-brand-400 transition-colors">{s.title}</h3>
              <p className="text-sm text-ink-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

