import { signUp } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Sign up — ApplyPilot AI" };

export default async function SignupPage() {
  return <AuthForm mode="signup" action={signUp} locale={await getLocale()} />;
}
