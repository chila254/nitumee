import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : user.role === "runner" ? "/runner" : "/bookings");

  const params = await searchParams;
  const wantsRunner = params.role === "runner";
  const mode = params.mode === "signup" || wantsRunner ? "signup" : "signin";

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">{mode === "signup" ? "Create your Nitumee account" : "Sign in to Nitumee"}</h1>
        <p className="text-sm text-stone-600">Email and password, or a passkey on this device.</p>
      </div>
      <LoginForm mode={mode} defaultRole={wantsRunner ? "runner" : "customer"} />
    </div>
  );
}
