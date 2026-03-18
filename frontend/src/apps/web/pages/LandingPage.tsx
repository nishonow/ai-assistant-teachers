import { CircleDollarSign, FileText, Landmark, MessageCircle, Scale, Siren, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../core/auth";

interface IssueItem {
  label: string;
  Icon: LucideIcon;
}

const ISSUES: IssueItem[] = [
  { label: "Salary delays", Icon: CircleDollarSign },
  { label: "Contract disputes", Icon: FileText },
  { label: "Dismissal pressure", Icon: Siren },
  { label: "Workload conflicts", Icon: Scale },
  { label: "Labor rights", Icon: Landmark },
  { label: "Teacher protections", Icon: ShieldCheck },
];

export default function LandingPage() {
  const { session } = useAuth();

  const primaryHref = session ? (session.user.role === "admin" ? "/admin" : "/app") : "/login";
  const secondaryHref = session ? "/app" : "/register";

  return (
    <main className="min-h-screen bg-[#050910] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
        <header className="border-2 border-[#1d3954] bg-[#0c1b2f] px-4 py-3 text-[#dffdf8] md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Mugallim AI</p>
              <p className="mt-1 text-sm text-[#a6dfd4]">Legal assistant for teachers</p>
            </div>

            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-[#53f6dc]/60 bg-[#53f6dc]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#53f6dc] transition hover:bg-[#53f6dc]/20"
            >
              <MessageCircle size={14} />
              Open Telegram Bot
            </a>
          </div>
        </header>

        <section className="grid border-x-2 border-b-2 border-[#1d3954] bg-[#0b111d] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b-2 border-[#1d3954] p-6 lg:border-b-0 lg:border-r-2 lg:p-10">
            <p className="inline-flex items-center gap-2 border border-[#53f6dc]/50 bg-[#17dfc1]/15 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#8cf7e8]">
              <ShieldCheck size={12} />
              Built for Kyrgyzstan teachers
            </p>

            <h1 className="mt-5 font-heading text-4xl leading-[0.95] text-[#f3fffc] md:text-5xl lg:text-6xl">
              Rights.
              <span className="block text-[#53f6dc]">Clearly.</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              Get direct legal guidance in simple language. Ask in web chat or start instantly in Telegram.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={primaryHref}
                className="inline-flex min-w-40 items-center justify-center border border-[#53f6dc] bg-[#53f6dc] px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#072019] transition hover:bg-[#17dfc1]"
              >
                {session ? "Continue" : "Login"}
              </Link>
              <Link
                to={secondaryHref}
                className="inline-flex min-w-40 items-center justify-center border border-[#53f6dc]/70 bg-transparent px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#dffdf8] transition hover:bg-[#53f6dc] hover:text-[#072019]"
              >
                {session ? "Open Chat" : "Register"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="border border-[#1d3954] bg-[#111b2e] p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Response</p>
                <p className="mt-1 font-heading text-2xl text-[#f3fffc]">~2 min</p>
              </div>
              <div className="border border-[#1d3954] bg-[#111b2e] p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Availability</p>
                <p className="mt-1 font-heading text-2xl text-[#f3fffc]">24/7</p>
              </div>
              <div className="border border-[#1d3954] bg-[#111b2e] p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Channels</p>
                <p className="mt-1 font-heading text-2xl text-[#f3fffc]">Web + Telegram</p>
              </div>
            </div>
          </div>

          <aside className="bg-[#0a1526] p-6 lg:p-10">
            <p className="mb-4 text-xs uppercase tracking-[0.14em] text-[#8cf7e8]">Frequent cases</p>

            <div className="space-y-2">
              {ISSUES.map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-3 border border-[#1d3954] bg-[#111b2e] px-3 py-3">
                  <Icon size={15} className="text-[#53f6dc]" />
                  <span className="text-sm text-[#f3fffc]">{label}</span>
                </div>
              ))}
            </div>

            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 border border-[#53f6dc] bg-[#0c1b2f] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#dffdf8] transition hover:bg-[#123157]"
            >
              <MessageCircle size={14} />
              Start in Telegram
            </a>
          </aside>
        </section>

        <div className="overflow-hidden border-x-2 border-b-2 border-[#1d3954] bg-[#0a1322] py-2 text-[#dffdf8]">
          <div className="landing-marquee-track flex w-max items-center gap-6 px-4 text-[11px] uppercase tracking-[0.14em] md:gap-8 md:px-6">
            {ISSUES.concat(ISSUES).map(({ label }, index) => (
              <span key={`${label}-${index}`} className="whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
