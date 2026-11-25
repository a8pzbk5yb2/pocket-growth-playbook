import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Phone } from "lucide-react";
import { AuthLayout, Field, PrimaryButton, SwitchLink } from "@/components/pb/auth";
import { meta } from "@/components/pb/shell";

export const Route = createFileRoute("/login")({
  head: () => meta("Log In", "Sign in to your PowerBank account to continue earning."),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  return (
    <AuthLayout title="Welcome Back to PowerBank" subtitle="Sign in to continue earning">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); nav({ to: "/" }); }}>
        <Field icon={Phone} prefix="+91" placeholder="Mobile Number" type="tel" />
        <Field icon={Lock} placeholder="Password" password />
        <div className="text-right"><Link to="/login" className="text-sm font-semibold text-primary-deep">Forgot Password?</Link></div>
        <PrimaryButton type="submit">Log In</PrimaryButton>
      </form>
      <SwitchLink text="Don't have an account?" to="/signup" label="Sign Up" />
    </AuthLayout>
  );
}
