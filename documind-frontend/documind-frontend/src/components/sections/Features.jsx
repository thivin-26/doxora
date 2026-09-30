import { FileStack, MessageCircle, Braces, PenSquare } from "lucide-react";
import FlipCard from "../FlipCard";

const features = [
  {
    icon: FileStack,
    title: "Smart summaries",
    front: "Concise, detailed, bulleted, or executive-style — pick the format that fits.",
    back: "Claude reads the full document and produces a summary tuned to your chosen style, ready to paste into a report.",
  },
  {
    icon: MessageCircle,
    title: "Chat with any doc",
    front: "Ask questions in plain language and get grounded answers, with memory per document.",
    back: "Every question and answer is kept in a conversation thread scoped to that document, so follow-ups stay in context.",
  },
  {
    icon: Braces,
    title: "Structured extraction",
    front: "Pull dates, entities, amounts, and tables out as clean JSON or CSV.",
    back: "Describe the fields you care about and Doxora extracts them into a structured, downloadable format.",
  },
  {
    icon: PenSquare,
    title: "Generate new docs",
    front: "Draft a report, memo, letter, or proposal from a prompt — optionally grounded in a source file.",
    back: "Export what Claude drafts straight to DOCX, PDF, or TXT — no copy-pasting between tools.",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-5 sm:px-8 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl mb-14 reveal-on-scroll">
          <p className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Everything you need to work with documents
          </h2>
          <p className="mt-4 text-ink-400">
            Hover a card to see it in action. One workspace, four ways to turn
            documents into answers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={f.title} className="reveal-on-scroll hover-shake" style={{ transitionDelay: `${i * 120}ms` }}>
              <FlipCard {...f} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
