import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gift, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, Field, PrimaryButton, SwitchLink } from "@/components/pb/auth";
import { meta } from "@/components/pb/shell";

export const Route = createFileRoute("/signup")({
  head: () => meta("Sign Up", "Create your PowerBank account and start your investment journey."),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [agree, setAgree] = useState(true);
  return (
    <AuthLayout title="Create Your PowerBank Account" subtitle="Join today and start your investment journey">
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        if (!agree) { toast.error("Please accept the Terms & Conditions"); return; }
        toast.success("Account created (demo)"); nav({ to: "/" });
      }}>
        <Field icon={User} placeholder="Full Name" />
        <Field icon={Phone} prefix="+91" placeholder="Mobile Number" type="tel" />
        <Field icon={Mail} placeholder="Email (Optional)" type="email" />
        <Field icon={Lock} placeholder="Create Password" password />
        <Field icon={Lock} placeholder="Confirm Password" password />
        <Field icon={Gift} placeholder="Invitation Code (Optional)" />
        <label className="flex items-start gap-2 py-1 text-[11px] leading-relaxed text-foreground">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>I agree to the <b className="text-primary">Terms & Conditions</b> and <b className="text-primary">Privacy Policy</b></span>
        </label>
        <PrimaryButton type="submit">Sign Up</PrimaryButton>
      </form>
      <SwitchLink text="Already have an account?" to="/login" label="Log In" />
    </AuthLayout>
  );
}
