import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../../../../logofull-dark.svg";
import LiquidBackdrop from "../../../core/components/LiquidBackdrop";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden font-sans text-white">
      <LiquidBackdrop />

      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-6 md:pt-4">
        <div className="glass-strong mx-auto flex h-14 w-full max-w-3xl items-center gap-3 rounded-full pl-2 pr-5">
          <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Назад" type="button">
            <ArrowLeft size={18} />
          </button>
          <Link to="/" className="flex items-center transition-opacity hover:opacity-80">
            <img src={logo} alt="Mektep AI" className="h-8 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 px-4 pb-16 pt-28 md:px-6 md:pb-20 md:pt-32">
        <article className="glass mx-auto max-w-3xl rounded-[30px] p-6 md:p-10 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white">
          <h1 className="mb-7 font-heading text-3xl font-bold tracking-[-0.03em] text-white md:text-[2.25rem]">{title}</h1>
          <div className="space-y-6 text-[15px] leading-relaxed text-white/65">{children}</div>
        </article>
      </section>

      <footer className="relative z-10 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-sm text-white/35 md:px-6">
        © {new Date().getFullYear()} Mektep AI. Все права защищены.
      </footer>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Политика конфиденциальности">
      <p className="text-sm font-medium text-white/40">Последнее обновление: 8 апреля 2026 г.</p>

      <div>
        <h3>1. Сбор информации</h3>
        <p>
          Мы собираем информацию, которую вы предоставляете напрямую, включая ваше имя, email 
          и любые данные, переданные в чате при обращении к боту Mektep AI. Эти данные 
          используются исключительно для предоставления услуг платформы.
        </p>
      </div>

      <div>
        <h3>2. Использование данных</h3>
        <p className="mb-2">Собранная информация используется для:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Обеспечения работы веб-чата и Telegram-бота.</li>
          <li>Сохранения истории ваших диалогов для вашего удобства.</li>
          <li>Улучшения качества наших ответов и сервиса.</li>
        </ul>
      </div>

      <div>
        <h3>3. Защита данных</h3>
        <p>
          Мы принимаем соответствующие технические и организационные меры для защиты вашей 
          личной информации от несанкционированного доступа, изменения или удаления. 
          Доступ к вашим запросам строго конфиденциален.
        </p>
      </div>

      <div>
        <h3>4. Передача третьим лицам</h3>
        <p>
          Мы не продаем, не обмениваем и не передаем вашу личную информацию третьим лицам без 
          вашего согласия, за исключением случаев, предусмотренных законодательством.
        </p>
      </div>

      <div>
        <h3>5. Изменения политики</h3>
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
      <p className="text-sm font-medium text-white/40">Последнее обновление: 8 апреля 2026 г.</p>

      <div>
        <h3>1. Общие положения</h3>
        <p>
          Настоящее Пользовательское соглашение регулирует условия использования сервиса Mektep AI, 
          предоставляющего информационную и правовую поддержку пользователям платформы (в первую 
          очередь — учителям и преподавателям).
        </p>
      </div>

      <div>
        <h3>2. Регистрация и аккаунт</h3>
        <p>
          Для полного доступа к истории диалогов в веб-приложении требуется регистрация или вход 
          соответствующим образом. Вы несете ответственность за сохранность и безопасность 
          данных для автоматического входа.
        </p>
      </div>

      <div>
        <h3>3. Характер предоставляемой информации</h3>
        <p>
          Сервис Mektep AI предоставляет ответы на основе встроенной базы документов и алгоритмов. 
          Обратите внимание: ответы носят исключительно справочный характер и не заменяют 
          профессиональную персональную юридическую консультацию.
        </p>
      </div>

      <div>
        <h3>4. Обязанности пользователя</h3>
        <p>
          Пользователь обязуется не использовать сервис для целей, противоречащих законодательству, 
          не рассылать спам, а также не пытаться нарушить техническую работу и алгоритмы платформы.
        </p>
      </div>

      <div>
        <h3>5. Ограничение ответственности</h3>
        <p>
          Платформа Mektep AI не несет ответственности за возможные убытки, возникшие в результате 
          использования или невозможности использования нашего сервиса. Решения, принятые 
          пользователем на основе ответов сервиса, принимаются под личную ответственность 
          пользователя.
        </p>
      </div>
    </LegalLayout>
  );
}
