import { FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-5 sm:px-8 py-10">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/doxora-logo.png" alt="DOXORA Logo" className="h-8 w-auto object-contain" />
          <span className="font-display font-extrabold text-gold-royal tracking-[0.2em] text-sm">
            DOXORA
          </span>
        </div>
        <p className="text-xs text-ink-400">
          © {new Date().getFullYear()} Doxora — Royal AI Document Studio.
        </p>
      </div>
    </footer>
  );
}
