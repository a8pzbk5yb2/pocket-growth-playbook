import { useDemo } from "./demo-store";
export function useMe() { const d = useDemo(); const me = d.users.find(u => u.id === d.currentUserId)!; return { d, me }; }
