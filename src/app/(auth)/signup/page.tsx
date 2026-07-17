import { signUp } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { getLocale, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = () => pageTitle("signUp");

export default async function SignupPage() {
  return <AuthForm mode="signup" action={signUp} locale={await getLocale()} />;
}
