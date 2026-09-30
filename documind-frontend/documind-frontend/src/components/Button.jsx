export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  as: Comp = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "h-9 px-3.5 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-7 text-base",
  };

  const variants = {
    primary:
      "bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[var(--shadow-glow)] hover:brightness-110 hover:shadow-[0_0_25px_rgba(124,92,255,0.6)] active:brightness-95",
    secondary:
      "bg-ink-800 text-ink-100 border border-ink-600 hover:bg-ink-700 hover:border-brand-400/40 hover:text-white",
    ghost: "text-ink-100 hover:bg-white/10 hover:text-white",
    outline:
      "border border-white/15 text-ink-100 hover:bg-white/10 hover:border-brand-400/50 hover:text-white",
  };

  return (
    <Comp
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
}
