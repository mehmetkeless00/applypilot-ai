import { signIn } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { getLocale, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = () => pageTitle("signIn");

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
