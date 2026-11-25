import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./shell";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-10">
        <div className="flex h-52 items-start justify-center rounded-b-[3rem] bg-gradient-primary pt-14">
          <Logo className="text-3xl" />
        </div>
        <div className="-mt-16 mx-5 rounded-3xl bg-card p-6 shadow-card">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ icon: Icon, placeholder, prefix, type = "text", password }: { icon?: LucideIcon; placeholder: string; prefix?: string; type?: string; password?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex h-13 items-center gap-2 rounded-2xl border bg-muted px-4 py-3 focus-within:border-primary">
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      {prefix && <span className="border-r pr-2 text-sm font-semibold">{prefix}</span>}
      <input
        type={password ? (show ? "text" : "password") : type}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {password && (
        <button type="button" onClick={() => setShow(!show)} aria-label="Toggle password" className="text-muted-foreground">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </label>
  );
}

export function PrimaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} className="w-full rounded-full bg-gradient-primary py-3.5 font-bold text-primary-foreground shadow-card transition active:scale-[0.98]">
      {children}
    </button>
  );
}

export function SwitchLink({ text, to, label }: { text: string; to: "/login" | "/signup"; label: string }) {
  return (
    <p className="pt-2 text-center text-sm text-muted-foreground">
      {text} <Link to={to} className="font-bold text-primary">{label}</Link>
    </p>
  );
}
