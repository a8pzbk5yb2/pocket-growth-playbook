import { Link, useNavigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Bell, ChevronDown, Home, LogOut, Menu, Search, X, Zap, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { apiConfigured } from "@/lib/api";
import promo from "@/assets/powerbank-home.webp.asset.json";
import { Avatar } from "./ui";

export type NavItem = { to: NonNullable<LinkProps["to"]>; label: string; icon: LucideIcon; exact?: boolean };

export function DemoBanner() {
  if (apiConfigured()) {
    return null;
  }
  return <div className="no-print bg-warning px-3 py-1 text-center text-[11px] font-bold tracking-wide text-foreground">DEMO MODE · Sample data only · No real money, deposits, withdrawals or investments · Resets on refresh</div>;
}

export function PanelLayout({ items, base, who, avatarName, unread, onBell, onLogout, profileTo, children }: { items: NavItem[]; base: string; who: string; avatarName: string; unread: number; onBell: () => void; onLogout: () => void; profileTo: NavItem["to"]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname }).replace(/\/$/, "") || "/";
  const current = items.find(i => (i.exact ? path === i.to : path === i.to || path.startsWith(i.to + "/"))) ?? items[0]!;
  const crumbRoot = base === "/admin" ? "Dashboard" : "My Account";
  const sidebar = <aside className="flex h-full w-64 flex-col bg-forest-gradient p-4 text-primary-foreground">
    <div className="mb-6 flex items-center justify-between px-2 pt-2"><Link to={base} className="flex items-center gap-2 text-2xl font-extrabold"><Zap className="h-8 w-8 fill-lime text-lime" />Power<span className="text-lime">Bank</span></Link><Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button></div>
    <nav className="flex-1 space-y-1 overflow-y-auto">{items.map(i => { const active = i === current; return <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active ? "bg-primary shadow-soft" : "hover:translate-x-0.5 hover:bg-primary-foreground/10"}`}><i.icon className="h-5 w-5" />{i.label}</Link>; })}
      <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-primary-foreground/10"><LogOut className="h-5 w-5" />Logout</button>
    </nav>
    <div className="mt-4 rounded-2xl bg-primary-foreground/10 p-3 text-center"><img src={promo.url} alt="" className="mx-auto h-24 object-contain" /><p className="mt-1 text-sm font-bold leading-tight">Grow Together<br />with PowerBank</p><span className="mt-2 inline-block rounded-full bg-lime px-3 py-1 text-[10px] font-bold text-forest">Fast • Secure • Reliable</span></div>
  </aside>;
  return <div className="min-h-screen bg-background">
    <DemoBanner />
    <div className="flex">
      <div className="no-print sticky top-0 hidden h-screen lg:block">{sidebar}</div>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="h-full">{sidebar}</div><button aria-label="Close menu" className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} /></div>}
      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-extrabold md:text-2xl">{current.label === "Overview" ? "Admin Overview" : current.label}</h1><p className="flex items-center gap-1 text-xs text-muted-foreground"><Home className="h-3 w-3 text-primary" />{crumbRoot} / <span className="text-foreground">{current.label}</span></p></div>
          <form className="relative hidden w-72 md:block" onSubmit={e => { e.preventDefault(); if (!q.trim()) return; const hit = items.find(i => i.label.toLowerCase().includes(q.toLowerCase())); if (hit) nav({ to: hit.to }); else toast(`No section matches “${q}”`); }}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search sections…" className="h-10 rounded-xl pl-9" aria-label="Search" />
          </form>
          <Button variant="ghost" size="icon" className="relative" onClick={onBell} aria-label="Notifications"><Bell />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}</Button>
          <DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-muted"><Avatar name={avatarName} /><span className="hidden text-sm font-semibold sm:inline">{who}</span><ChevronDown className="h-4 w-4" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuLabel>{avatarName}</DropdownMenuLabel><DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav({ to: profileTo })}>Profile & settings</DropdownMenuItem>
              <DropdownMenuItem onClick={onBell}>Notifications</DropdownMenuItem>
              <DropdownMenuSeparator /><DropdownMenuItem onClick={onLogout} className="text-destructive">Logout</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </header>
        <main className="space-y-5 p-4 md:p-6">{children}</main>
      </div>
    </div>
  </div>;
}
