import { Link } from "@tanstack/react-router";
import { ChevronLeft, Home, Gem, ListChecks, Users, Wallet, User, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import emptyImage from "@/assets/powerbank-empty.webp.asset.json";

export function Logo({ className = "" }: { className?: string }) {
  return <div className={`pb-logo ${className}`}><Zap aria-hidden="true" /><span>Power<span className="text-lime">Bank</span></span></div>;
}

const tabs = [
  { to: "/", label: "Home", icon: Home }, { to: "/plans", label: "Plans", icon: Gem },
  { to: "/tasks", label: "Task", icon: ListChecks }, { to: "/team", label: "Team", icon: Users },
  { to: "/wallet", label: "Wallet", icon: Wallet }, { to: "/me", label: "Me", icon: User },
] as const;

export function MobileShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return <div className="pb-stage"><div className={`pb-app ${nav ? "has-nav" : ""}`}>
    {children}
    {nav && <nav className="pb-bottom-nav" aria-label="Main navigation">
      {tabs.map(({ to, label, icon: Icon }) => <Link key={to} to={to} activeOptions={{ exact: true }}><Icon /><span>{label}</span></Link>)}
    </nav>}
  </div></div>;
}

export function PageBar({ title, backTo = "/" }: { title: string; backTo?: "/" | "/wallet" }) {
  return <div className="pb-page-bar"><Button asChild variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10"><Link to={backTo} aria-label="Back"><ChevronLeft /></Link></Button><h1>{title}</h1><span className="w-9" /></div>;
}

export function GreenHeader({ title, subtitle, image, back, pageTitle, children }: { title?: string; subtitle?: string; image?: string; back?: boolean; pageTitle?: string; children?: ReactNode }) {
  return <header className={`pb-green-header ${back ? "pb-art-header" : ""}`}>
    <PageBar title={pageTitle ?? title ?? "PowerBank"} backTo={back ? "/wallet" : "/"} />
    {back ? image && <img className="pb-large-art" src={image} alt="" /> : <div className="pb-feature-banner">
      <div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>
      {image && <img src={image} alt="" />}
    </div>}
    {children}
  </header>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pb-card ${className}`}>{children}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="pb-empty"><img src={emptyImage.url} alt="" /><h2>No Transactions Yet</h2><p>{text}</p></div>;
}

export function Pills<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return <div className="pb-pills" role="group" aria-label="Filter">{items.map(i => <Button variant="ghost" key={i} onClick={() => onChange(i)} aria-pressed={value === i} className={value === i ? "is-active" : ""}>{i}</Button>)}</div>;
}

export const meta = (title: string, description: string) => ({ meta: [
  { title: `${title} | PowerBank` }, { name: "description", content: description },
  { property: "og:title", content: `${title} | PowerBank` }, { property: "og:description", content: description },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] });
