"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { signIn, signUp, type FormState } from "@/app/actions";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkeys-client";

const initial: FormState = {};
const subscribeNever = () => () => {};

export function LoginForm({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [state, setState] = useState<FormState>(initial);
  const [pending, startTransition] = useTransition();
  const [passkeyError, setPasskeyError] = useState("");
  const [passkeyPending, setPasskeyPending] = useState(false);

  // Read browser support outside render so the server-rendered HTML and the
  // hydrated client agree (passkeys are unknown until hydration).
  const canPasskey = useSyncExternalStore(subscribeNever, passkeysSupported, () => false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setState(initial);
    startTransition(async () => {
      const action = tab === "signin" ? signIn : signUp;
      const result = await action(initial, formData);
      setState(result);
      if (tab === "signup") form.reset();
    });
  }

  async function passkey() {
    setPasskeyError("");
    setPasskeyPending(true);
    try {
      window.location.assign(await signInWithPasskey());
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Passkey failed.");
      setPasskeyPending(false);
    }
  }

  function switchTab(next: "signin" | "signup") {
    setTab(next);
    setState(initial);
    setPasskeyError("");
  }

  return (
    <div className="card space-y-4">
      <div role="tablist" aria-label="Sign in or create account" className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-medium">
        {(["signin", "signup"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => switchTab(id)}
            className={`rounded-lg px-3 py-2 transition ${tab === id ? "bg-white shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
          >
            {id === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {tab === "signup" && (
          <label className="block space-y-1 text-sm font-medium">
            Your name
            <input name="name" className="field" placeholder="Wanjiku" autoComplete="name" required />
          </label>
        )}
        <label className="block space-y-1 text-sm font-medium">
          Email
          <input name="email" type="email" className="field" placeholder="you@example.com" autoComplete="email" required />
        </label>
        {tab === "signup" && (
          <label className="block space-y-1 text-sm font-medium">
            Delivery phone <span className="font-normal text-stone-400">(optional)</span>
            <input name="phone" className="field" placeholder="0712 345 678" inputMode="tel" autoComplete="tel" />
          </label>
        )}
        <label className="block space-y-1 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            className="field"
            placeholder={tab === "signup" ? "At least 8 characters" : "Your password"}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            minLength={tab === "signup" ? 8 : undefined}
            required
          />
        </label>
        {tab === "signup" && (
          <label className="block space-y-1 text-sm font-medium">
            Confirm password
            <input name="confirm" type="password" className="field" autoComplete="new-password" minLength={8} required />
          </label>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button className="btn w-full" disabled={pending}>
          {pending ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {canPasskey && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            or
            <span className="h-px flex-1 bg-stone-200" />
          </div>
          <button type="button" className="btn-secondary w-full" onClick={passkey} disabled={passkeyPending}>
            {passkeyPending ? "Waiting for your device…" : "Sign in with a passkey"}
          </button>
          {passkeyError && (
            <p role="alert" className="text-sm text-red-600">
              {passkeyError}
            </p>
          )}
          {tab === "signup" && (
            <p className="text-xs text-stone-500">
              Already created an account? After your first password sign-in you can add a passkey in your profile for one-tap
              login.
            </p>
          )}
        </>
      )}
    </div>
  );
}
