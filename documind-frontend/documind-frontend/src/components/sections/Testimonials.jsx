import { Star } from "lucide-react";

const quotes = [
  {
    name: "Ananya R.",
    role: "Operations Lead, Coimbatore",
    text: "We used to skim 40-page vendor contracts by hand. Now we upload them and ask DocuMind directly — cut our review time by more than half.",
  },
  {
    name: "Marcus T.",
    role: "Freelance Consultant",
    text: "The extract feature turns messy scanned reports into clean CSVs I can drop straight into a spreadsheet. Genuinely saves me hours every week.",
  },
  {
    name: "Priya K.",
    role: "Grad Researcher",
    text: "Chatting with a paper instead of re-reading it end to end changed how I do literature review. The per-document memory is what sold me.",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative px-5 sm:px-8 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl mb-14">
          <p className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">
            Testimonials
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Trusted by people who read a lot of documents
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map((q) => (
            <div
              key={q.name}
              className="rounded-2xl border border-white/10 bg-ink-800/50 p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex gap-1 mb-4 text-accent-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="text-sm text-ink-200 leading-relaxed mb-6">
                “{q.text}”
              </p>
              <div>
                <p className="text-sm font-medium text-white">{q.name}</p>
                <p className="text-xs text-ink-400">{q.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
