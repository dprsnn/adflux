import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/Logo.svg" alt="AdFlux" width={120} height={35} />
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <UserMenu
                email={user.email ?? ""}
                name={user.user_metadata?.name ?? null}
                avatarUrl={user.user_metadata?.avatar_url ?? null}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Увійти
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Почати безкоштовно
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:px-6 lg:px-8">
          {/* Gradient background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-border/50 bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
              SaaS-платформа для маркетологів
            </div>

            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Від товару до{" "}
              <span className="text-primary">рекламного креативу</span> за
              кілька хвилин
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              AdFlux автоматизує створення рекламних банерів для Meta за
              допомогою ШІ. Аналіз бренду, генерація зображень, редагування та
              експорт — все в одному місці.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={user ? "/dashboard" : "/register"}
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {user ? "Перейти до кабінету" : "Почати безкоштовно"}
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-8 text-base font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Дізнатись більше
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">
              Як це працює
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">
              Чотири прості кроки від вашого товару до готового рекламного банеру
            </p>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/30 hover:bg-card/80"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                    {i + 1}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Models */}
        <section className="border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">
              AI-моделі генерації
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">
              Оберіть модель під вашу задачу — від швидкої генерації до
              фотореалістичних зображень
            </p>

            <div className="grid gap-6 sm:grid-cols-3">
              {models.map((model) => (
                <div
                  key={model.name}
                  className="rounded-xl border border-border/50 bg-card p-6"
                >
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    {model.name}
                  </h3>
                  <p className="mb-4 text-sm text-primary">{model.provider}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {model.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/50 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              Готові створити перший креатив?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Зареєструйтесь безкоштовно та отримайте 10 генерацій для старту
            </p>
            <Link
              href={user ? "/dashboard" : "/register"}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {user ? "Перейти до кабінету" : "Створити акаунт"}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Image src="/Logo.svg" alt="AdFlux" width={90} height={26} />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} AdFlux
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Аналіз бренду",
    description:
      "Вставте посилання на сайт — ШІ автоматично проаналізує стиль, кольори, тон та конкурентів вашого бренду.",
  },
  {
    title: "Додайте товар",
    description:
      "Завантажте фото та опис товару. ШІ визначить болі аудиторії, УТП та запропонує слогани.",
  },
  {
    title: "Генерація креативів",
    description:
      "Оберіть шаблони з бібліотеки 40+ форматів та AI-модель. Отримайте готові банери за секунди.",
  },
  {
    title: "Редагування та експорт",
    description:
      "Відредагуйте текст і елементи в канвас-редакторі. Експортуйте у всіх форматах Meta одним кліком.",
  },
];

const models = [
  {
    name: "Nano Banana 2",
    provider: "FAL.ai",
    description:
      "Швидка генерація базової якості. Ідеальна для тестування ідей та швидких ітерацій.",
  },
  {
    name: "GPT-Image-1",
    provider: "OpenAI",
    description:
      "Висока якість та точне слідування промту. Найкращий баланс швидкості та результату.",
  },
  {
    name: "FLUX Pro",
    provider: "FAL.ai",
    description:
      "Фотореалістичні зображення з високою деталізацією. Для преміум-креативів.",
  },
];
