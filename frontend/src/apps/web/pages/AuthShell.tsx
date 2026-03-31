import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logo.png";

const BRAND_LINES = ["Ответы на основе документов", "История диалогов", "Telegram и веб"];

const bodyFont = { fontFamily: '"DM Sans", sans-serif' } as const;
const serifFont = { fontFamily: '"Instrument Serif", serif' } as const;

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
    <main className="min-h-[100svh] bg-[#fafaf8] text-[#1c1b18]" style={bodyFont}>
      <div className="grid min-h-[100svh] lg:grid-cols-2">
        <section className="relative hidden bg-[#f2f0eb] lg:flex">
          <div className="flex min-h-screen w-full flex-col px-10 py-10 xl:px-14 xl:py-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff]">
                <img src={logo} alt="Mugallim AI" className="h-full w-full object-cover" />
              </div>
              <Link to="/" className="text-[1.6rem] leading-none text-[#1c1b18]" style={serifFont}>
                Mugallim AI
              </Link>
            </div>

            <div className="flex flex-1 items-center">
              <div className="max-w-[30rem]">
                <p className="text-[3.4rem] italic leading-[1] tracking-[-0.03em] text-[#1c1b18] xl:text-[4.25rem]" style={serifFont}>
                  Спокойный сервис для рабочих и правовых вопросов в школе.
                </p>

                <div className="mt-10 space-y-4">
                  {BRAND_LINES.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-[15px] text-[#6b6960]">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#c4922a]">
                        <CheckCircle2 size={15} />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-[#6b6960]">© 2025 Mugallim AI</p>
          </div>
        </section>

        <section className="flex min-h-[100svh] items-center justify-center bg-[#ffffff] px-6 py-6 sm:px-8 sm:py-8">
          <div className="w-full max-w-[360px]">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 text-[#1c1b18] sm:mb-10 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff]">
                <img src={logo} alt="Mugallim AI" className="h-full w-full object-cover" />
              </span>
              <span className="text-[1.55rem] leading-none" style={serifFont}>
                Mugallim AI
              </span>
            </Link>

            <p className="text-[13px] font-medium text-[#6b6960]">{eyebrow}</p>
            <h1 className="mt-3 text-[36px] leading-none text-[#1c1b18]" style={serifFont}>
              <span className="italic">{title}</span>
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[#6b6960]">{subtitle}</p>

            <div className="mt-8 sm:mt-10">{children}</div>

            <p className="mt-6 text-sm text-[#6b6960] sm:mt-8">
              {footerText}{" "}
              <Link to={footerLinkTo} className="font-medium text-[#c4922a] transition-colors duration-150 ease-in-out hover:text-[#ab7e24]">
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
