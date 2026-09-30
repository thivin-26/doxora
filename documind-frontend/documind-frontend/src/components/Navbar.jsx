import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Menu, X, Crown } from "lucide-react";
import Button from "./Button";
import { useAuth } from "../context/useAuth";

const publicLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isOwner, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-amber-400/40 bg-black/60 shadow-[0_0_20px_rgba(247,210,104,0.3)] group-hover:scale-105 group-hover:border-amber-400/70 transition-all duration-300 flex items-center justify-center p-1">
            <img src="/doxora-logo.png" alt="DOXORA Logo" className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-300 mix-blend-screen" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg text-gold-royal tracking-[0.2em] leading-tight group-hover:brightness-125 transition-all">
              DOXORA
            </span>
            <span className="text-[9px] font-semibold text-amber-400/80 tracking-[0.25em] uppercase">
              AI DOCUMENT STUDIO
            </span>
          </div>
        </Link>

        {/* Desktop Public Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {publicLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink-200 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}

          {/* Owner-Only Secret Visitors Database link */}
          {isOwner && (
            <Link
              to="/analytics"
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1.5 bg-amber-400/15 px-3 py-1 rounded-full border border-amber-400/40 shadow-[0_0_12px_rgba(247,210,104,0.25)] animate-pulse"
              title="Only visible to website owner"
            >
              <Crown size={12} className="text-amber-400" />
              <span>Owner DB</span>
            </Link>
          )}
        </div>

        {/* Desktop CTA / Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" as={Link} to="/login">
                Log in
              </Button>
              <Button variant="primary" size="sm" as={Link} to="/login?mode=signup">
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden text-ink-100 cursor-pointer"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-ink-950 px-5 py-4 flex flex-col gap-4">
          {publicLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm text-ink-200"
            >
              {l.label}
            </a>
          ))}

          {isOwner && (
            <Link
              to="/analytics"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-amber-300 flex items-center gap-2 bg-amber-500/15 p-2.5 rounded-xl border border-amber-400/40"
            >
              <Crown size={14} className="text-amber-400" />
              <span>Owner Visitors DB (Private)</span>
            </Link>
          )}

          <div className="flex gap-3 pt-2">
            {user ? (
              <Button className="w-full" as={Link} to="/dashboard">
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" as={Link} to="/login">
                  Log in
                </Button>
                <Button className="w-full" as={Link} to="/login?mode=signup">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
