import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getLocale, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = () => pageTitle("forgotPassword");

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm locale={await getLocale()} />;
}
