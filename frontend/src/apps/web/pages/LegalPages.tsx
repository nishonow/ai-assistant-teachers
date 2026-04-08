import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../../../../logo.png";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-[100svh] overflow-hidden bg-slate-50 font-sans text-slate-900 selection:bg-brand-500/30">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 md:px-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            aria-label="Назад"
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <Link
            to="/"
            className="flex items-center gap-3 text-slate-900 transition-opacity hover:opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img src={logo} alt="Mugallim AI" className="h-full w-full object-cover" />
            </span>
            <span className="text-xl font-bold tracking-tight">Mugallim AI</span>
          </Link>
        </div>
      </header>

      <section className="relative px-4 pb-20 pt-[120px] md:px-6 md:pb-24 md:pt-[140px]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            {title}
          </h1>
          <div className="space-y-6 text-base leading-relaxed text-slate-600">
            {children}
          </div>
        </div>
      </section>

      <footer className="bg-slate-50 px-4 py-8 md:px-6 border-t border-slate-200/60">
        <div className="mx-auto text-center text-sm font-bold text-slate-400">
          © {new Date().getFullYear()} Mugallim AI. Все права защищены.
        </div>
      </footer>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Политика конфиденциальности">
      <p className="text-sm font-semibold text-slate-400">Последнее обновление: 8 апреля 2026 г.</p>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">1. Сбор информации</h3>
        <p>
          Мы собираем информацию, которую вы предоставляете напрямую, включая ваше имя, email 
          и любые данные, переданные в чате при обращении к боту Mugallim AI. Эти данные 
          используются исключительно для предоставления услуг платформы.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">2. Использование данных</h3>
        <p className="mb-2">Собранная информация используется для:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Обеспечения работы веб-чата и Telegram-бота.</li>
          <li>Сохранения истории ваших диалогов для вашего удобства.</li>
          <li>Улучшения качества наших ответов и сервиса.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">3. Защита данных</h3>
        <p>
          Мы принимаем соответствующие технические и организационные меры для защиты вашей 
          личной информации от несанкционированного доступа, изменения или удаления. 
          Доступ к вашим запросам строго конфиденциален.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">4. Передача третьим лицам</h3>
        <p>
          Мы не продаем, не обмениваем и не передаем вашу личную информацию третьим лицам без 
          вашего согласия, за исключением случаев, предусмотренных законодательством.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">5. Изменения политики</h3>
        <p>
          Мы оставляем за собой право обновлять эту политику в любое время. Изменения 
          вступают в силу с момента публикации на данной странице.
        </p>
      </div>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Пользовательское соглашение">
      <p className="text-sm font-semibold text-slate-400">Последнее обновление: 8 апреля 2026 г.</p>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">1. Общие положения</h3>
        <p>
          Настоящее Пользовательское соглашение регулирует условия использования сервиса Mugallim AI, 
          предоставляющего информационную и правовую поддержку пользователям платформы (в первую 
          очередь — учителям и преподавателям).
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">2. Регистрация и аккаунт</h3>
        <p>
          Для полного доступа к истории диалогов в веб-приложении требуется регистрация или вход 
          соответствующим образом. Вы несете ответственность за сохранность и безопасность 
          данных для автоматического входа.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">3. Характер предоставляемой информации</h3>
        <p>
          Сервис Mugallim AI предоставляет ответы на основе встроенной базы документов и алгоритмов. 
          Обратите внимание: ответы носят исключительно справочный характер и не заменяют 
          профессиональную персональную юридическую консультацию.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">4. Обязанности пользователя</h3>
        <p>
          Пользователь обязуется не использовать сервис для целей, противоречащих законодательству, 
          не рассылать спам, а также не пытаться нарушить техническую работу и алгоритмы платформы.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">5. Ограничение ответственности</h3>
        <p>
          Платформа Mugallim AI не несет ответственности за возможные убытки, возникшие в результате 
          использования или невозможности использования нашего сервиса. Решения, принятые 
          пользователем на основе ответов сервиса, принимаются под личную ответственность 
          пользователя.
        </p>
      </div>
    </LegalLayout>
  );
}
