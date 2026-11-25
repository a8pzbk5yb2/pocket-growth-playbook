import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "./shell";
import loginArt from "@/assets/powerbank-login.webp.asset.json";
import signupArt from "@/assets/powerbank-signup.webp.asset.json";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const signup = title.startsWith("Create");
  return <div className="pb-stage"><div className={`pb-auth ${signup ? "pb-signup" : "pb-login"}`}>
    <header className="pb-auth-header"><Logo /><img src={signup ? signupArt.url : loginArt.url} alt="" /></header>
    <main className="pb-auth-panel">
      <h1>{signup ? <>Create Your<br /><span>PowerBank Account</span></> : <>Welcome Back to<br /><span>PowerBank</span></>}</h1>
      <p className="pb-auth-subtitle">{subtitle}</p>
      <div className="pb-auth-form">{children}</div>
    </main>
    <div className="pb-auth-waves" aria-hidden="true"><i /><i /><i /></div>
  </div></div>;
}

export function Field({ icon: Icon, placeholder, prefix, type = "text", password }: { icon?: LucideIcon; placeholder: string; prefix?: string; type?: string; password?: boolean }) {
  const [show, setShow] = useState(false);
  return <label className="pb-field">{Icon && <Icon className="pb-field-icon" />}
    {prefix && <span className="pb-country">{prefix}<ChevronDown /></span>}
    <input type={password ? (show ? "text" : "password") : type} placeholder={placeholder} aria-label={placeholder} />
    {password && <Button variant="ghost" size="icon" type="button" onClick={() => setShow(!show)} aria-label="Toggle password" className="pb-eye">{show ? <Eye /> : <EyeOff />}</Button>}
  </label>;
}

export function PrimaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return <Button type={type} onClick={onClick} className="pb-primary-button">{children}{(children === "Log In" || children === "Sign Up") && <ChevronRight />}</Button>;
}

export function SwitchLink({ text, to, label }: { text: string; to: "/login" | "/signup"; label: string }) {
  return <p className="pb-switch-link">{text} <Link to={to}>{label}</Link></p>;
}
