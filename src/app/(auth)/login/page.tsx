import { signIn } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Sign in — ApplyPilot AI" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const { next, message } = await searchParams;
  const locale = await getLocale();
  return (
    <AuthForm
      mode="login"
      action={signIn}
      next={next}
      message={message}
      locale={locale}
    />
  );
}
