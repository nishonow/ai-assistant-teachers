import { CheckCircle2, GraduationCap, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logo.png";

const BRAND_LINES = [
  "Ответы на основе документов",
  "История диалогов сохраняется",
  "Telegram и веб-чат",
];

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  children: ReactNode;
}

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-[100svh] bg-ink-950 font-sans text-white selection:bg-brand-500/30 overflow-hidden">
      <div className="grid min-h-[100svh] lg:grid-cols-2">

        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-start lg:justify-between">
          {/* Grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,199,171,0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,199,171,0.07) 1px, transparent 1px)
              `,
              backgroundSize: "72px 72px",
            }}
          />

          {/* Glow orbs */}
          <div
            className="pointer-events-none absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[140px]"
            style={{ background: "radial-gradient(circle, #00c7ab 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[300px] translate-x-1/3 translate-y-1/3 rounded-full opacity-10 blur-[80px]"
            style={{ background: "radial-gradient(circle, #2f4f74 0%, transparent 70%)" }}
          />

          {/* Floating decoration */}
          <div
            className="pointer-events-none absolute right-16 top-1/3 opacity-15"
            style={{ animation: "float 10s ease-in-out infinite" }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/10">
              <Scale size={24} className="text-brand-400" />
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-10 xl:px-14 xl:py-12">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 text-white transition-opacity hover:opacity-80">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
                <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
              </span>
              <span className="text-xl font-extrabold tracking-tight">Mugalim AI</span>
            </Link>

            {/* Center content */}
            <div className="flex flex-1 items-center">
              <div className="max-w-[28rem]">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-300">
                  <GraduationCap size={13} />
                  Для учителей Кыргызстана
                </div>
                <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
                  Спокойный сервис для рабочих и правовых вопросов в школе.
                </h2>

                <div className="mt-10 space-y-4">
                  {BRAND_LINES.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-base font-medium text-white/60">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15">
                        <CheckCircle2 size={13} className="text-brand-400" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-white/25">
              © {new Date().getFullYear()} Mugalim AI
            </p>
          </div>
        </section>

        {/* ── RIGHT PANEL (form) ───────────────────────────────── */}
        <section className="relative flex min-h-[100svh] items-center justify-center px-6 py-8 sm:px-8">
          {/* Subtle left border glow on desktop */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />

          <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mobile logo */}
            <Link
              to="/"
              className="mb-10 inline-flex items-center gap-3 text-white lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
                <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
              </span>
              <span className="text-xl font-extrabold tracking-tight">Mugalim AI</span>
            </Link>

            {/* Heading */}
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-400">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/45">
              {subtitle}
            </p>

            <div className="mt-8 sm:mt-10">{children}</div>

            <p className="mt-8 text-sm font-medium text-white/40">
              {footerText}{" "}
              <Link
                to={footerLinkTo}
                className="font-bold text-brand-400 transition-colors hover:text-brand-300"
              >
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
