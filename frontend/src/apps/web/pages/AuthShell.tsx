import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logo.png";

const BRAND_LINES = ["Ответы на основе документов", "История диалогов", "Telegram и веб"];

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
    <main className="min-h-[100svh] bg-slate-50 text-slate-900 font-sans selection:bg-brand-500/30 overflow-hidden">
      <div className="grid min-h-[100svh] lg:grid-cols-2">
        <section className="relative hidden bg-brand-50 lg:flex items-center overflow-hidden">
          {/* Subtle geometric blurs for modern background */}
          <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-brand-200/50 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-80 h-80 bg-brand-300/30 rounded-full blur-3xl opacity-60" />

          <div className="relative flex min-h-screen w-full flex-col px-10 py-10 xl:px-14 xl:py-12 z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
              </div>
              <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
                Mugalim AI
              </Link>
            </div>

            <div className="flex flex-1 items-center">
              <div className="max-w-[30rem]">
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 xl:text-5xl leading-[1.1]">
                  Спокойный сервис для рабочих и правовых вопросов в школе.
                </h2>

                <div className="mt-10 space-y-4">
                  {BRAND_LINES.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-[16px] font-medium text-slate-600">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-brand-500 bg-brand-100/50">
                        <CheckCircle2 size={16} />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-500">© {new Date().getFullYear()} Mugalim AI</p>
          </div>
        </section>

        <section className="flex min-h-[100svh] items-center justify-center bg-white px-6 py-6 sm:px-8 sm:py-8 lg:rounded-l-3xl lg:shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.05)] z-20">
          <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 text-slate-900 sm:mb-10 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
              </span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Mugalim AI
              </span>
            </Link>

            <p className="text-[13px] font-bold uppercase tracking-wider text-brand-600">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{subtitle}</p>

            <div className="mt-8 sm:mt-10">{children}</div>

            <p className="mt-6 text-sm text-slate-600 sm:mt-8">
              {footerText}{" "}
              <Link to={footerLinkTo} className="font-bold text-brand-600 transition-colors duration-200 ease-in-out hover:text-brand-500 hover:underline">
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
