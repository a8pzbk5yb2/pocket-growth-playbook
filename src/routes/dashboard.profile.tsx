import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meta } from "@/components/pb/shell";
import { Avatar, Section, Status } from "@/components/panel/ui";
import { useMe } from "@/lib/use-me";
export const Route = createFileRoute("/dashboard/profile")({ head: () => meta("My Profile", "Edit your PowerBank demo profile."), component: P });
function P() {
  const { d, me } = useMe(); const [name, setName] = useState(me.name); const [pw, setPw] = useState("");
  return <Section title="My Profile" icon={User}><div className="mb-4 flex items-center gap-4"><Avatar name={me.name} size="h-16 w-16 text-lg" /><div><p className="text-lg font-bold">{me.name}</p><p className="text-sm text-muted-foreground">User ID {me.id} · +91 {me.mobile}</p><div className="mt-1 flex gap-2"><Status s={me.status} /><Status s={me.kyc} /></div></div></div>
    <form className="grid max-w-xl gap-3" onSubmit={e => { e.preventDefault(); if (!name.trim()) { toast.error("Name is required"); return; } if (pw && pw.length < 6) { toast.error("Password must be at least 6 characters"); return; } d.updateUser(me.id, { name: name.trim(), ...(pw ? { password: pw } : {}) }); setPw(""); toast.success("Profile updated (demo)"); }}>
      <div><Label>Full Name</Label><Input value={name} maxLength={60} onChange={e => setName(e.target.value)} /></div><div><Label>New password (optional)</Label><Input type="password" value={pw} onChange={e => setPw(e.target.value)} /></div><Button className="w-40">Save changes</Button></form></Section>;
}
