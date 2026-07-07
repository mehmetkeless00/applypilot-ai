import { signUp } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign up — ApplyPilot AI" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
