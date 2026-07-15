import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Choose a new password" };

// Reached from the recovery-link callback, which establishes a session.
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Link href="/" className="mb-8 text-xl font-bold text-slate-900 dark:text-slate-100">
        ApplyPilot <span className="text-indigo-600">AI</span>
      </Link>
      <ResetPasswordForm />
    </div>
  );
}
