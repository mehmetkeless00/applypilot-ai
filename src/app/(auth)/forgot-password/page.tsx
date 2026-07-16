import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm locale={await getLocale()} />;
}
