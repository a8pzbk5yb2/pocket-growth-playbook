import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home, LayoutGrid, ListChecks, Users, Wallet, User, Zap } from "lucide-react";
import type { ReactNode } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xl font-extrabold tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime text-primary-deep">
        <Zap className="h-5 w-5 fill-current" />
      </span>
      <span className="text-primary-foreground">Power</span>
      <span className="-ml-1.5 text-lime">Bank</span>
    </div>
  );
}

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/plans", label: "Plans", icon: LayoutGrid },
  { to: "/tasks", label: "Task", icon: ListChecks },
  { to: "/team", label: "Team", icon: Users },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/me", label: "Me", icon: User },
] as const;

export function MobileShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="min-h-screen bg-muted">
      <div className="relative mx-auto min-h-screen max-w-[430px] bg-background pb-24 shadow-card">
        {children}
        {nav && (
          <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t bg-card px-1 py-2">
            {tabs.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-semibold text-muted-foreground data-[status=active]:text-primary"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export function GreenHeader({
  title, subtitle, image, back, children,
}: { title?: string; subtitle?: string; image?: string; back?: boolean; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-primary px-5 pb-8 pt-6 text-primary-foreground">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
      <div className="flex items-center justify-between">
        {back ? (
          <Link to="/wallet" className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/15" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : <Logo />}
      </div>
      {(title || image) && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            {title && <h1 className="text-2xl font-extrabold leading-tight">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-primary-foreground/85">{subtitle}</p>}
          </div>
          {image && (
            <img src={image} alt="" className="h-24 w-24 shrink-0 rounded-3xl bg-card object-contain p-1.5 shadow-card" />
          )}
        </div>
      )}
      {children}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-card p-4 shadow-card ${className}`}>{children}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <ListChecks className="h-9 w-9" />
      </div>
      <p className="mt-3 font-semibold">No transactions yet</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Pills<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {items.map((i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${value === i ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-card"}`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title: `${title} | PowerBank` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} | PowerBank` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
