"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { signIn, signUp, type FormState } from "@/app/actions";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkeys-client";
import { AREAS } from "@/lib/slots";
import { VEHICLES } from "@/lib/vetting";

const initial: FormState = {};
const subscribeNever = () => () => {};

export function LoginForm({
  mode = "signin",
  defaultRole = "customer",
}: {
  mode?: "signin" | "signup";
  defaultRole?: "customer" | "runner";
}) {
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  // Each tab owns its own action state so switching tabs never shows the
  // other form's error.
  const [signInState, signInAction, signInPending] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);
  const isSignUp = tab === "signup";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signUpPending : signInPending;

  // Keep what was typed after a rejected submit: React clears uncontrolled
  // inputs when a form action returns, and retyping an email to fix a typo is
  // the fastest way to lose a sign-up.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "runner">(defaultRole);
  const [vehicle, setVehicle] = useState("bike");

  const [passkeyError, setPasskeyError] = useState("");
  const [passkeyPending, setPasskeyPending] = useState(false);
  // Read browser support outside render so the server-rendered HTML and the
  // hydrated client agree (passkeys are unknown until hydration).
  const canPasskey = useSyncExternalStore(subscribeNever, passkeysSupported, () => false);

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

      {/* A real form action, not an onSubmit handler: the browser POSTs the
          action id, so submitting before the client bundle loads (slow network,
          stale tab after a deploy) still reaches the server instead of falling
          back to a GET that puts the password in the URL. */}
      <form key={tab} action={isSignUp ? signUpAction : signInAction} className="space-y-4">
        {isSignUp && (
          <label className="block space-y-1 text-sm font-medium">
            Your name
            <input
              name="name"
              className="field"
              placeholder="Wanjiku"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}
        {isSignUp && (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">I&apos;m signing up as</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { id: "customer", title: "Customer", copy: "Book a shopper" },
                    { id: "runner", title: "Runner", copy: "Shop for customers" },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-300 px-3 py-2 text-sm has-checked:border-accent has-checked:bg-accent/5"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.id}
                      checked={role === option.id}
                      onChange={() => setRole(option.id)}
                      className="accent-teal-700"
                    />
                    <span>
                      <span className="font-medium">{option.title}</span>
                      <span className="block text-xs text-stone-500">{option.copy}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {role === "runner" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm font-medium">
                    How you get around
                    <select name="vehicle" className="field" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                      {VEHICLES.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {vehicle !== "foot" && (
                    <label className="block space-y-1 text-sm font-medium">
                      Number plate
                      <input name="plate" className="field uppercase" placeholder="KDA 123X" required />
                    </label>
                  )}
                </div>
                <label className="block space-y-1 text-sm font-medium">
                  National ID number
                  <input name="idNumber" className="field" placeholder="12345678" inputMode="numeric" required />
                  <span className="block text-xs font-normal text-stone-500">
                    Only Nitumee admins can see this — it is used for vetting.
                  </span>
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Areas you can serve</legend>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {AREAS.map((area) => (
                      <label key={area} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2">
                        <input type="checkbox" name="areas" value={area} className="accent-teal-700" />
                        {area}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Every runner is vetted before taking jobs. Applications are reviewed by a person, so you may wait a
                  little before your first run.
                </p>
              </>
            )}
          </>
        )}
        <label className="block space-y-1 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            className="field"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {isSignUp && (
          <label className="block space-y-1 text-sm font-medium">
            {role === "runner" ? "Phone" : "Delivery phone"}{" "}
            <span className="font-normal text-stone-400">{role === "runner" ? "(required)" : "(optional)"}</span>
            <input
              name="phone"
              className="field"
              placeholder="0712 345 678"
              inputMode="tel"
              autoComplete="tel"
              required={role === "runner"}
            />
          </label>
        )}
        <label className="block space-y-1 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            className="field"
            placeholder={isSignUp ? "At least 8 characters" : "Your password"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={isSignUp ? 8 : undefined}
            required
          />
        </label>
        {isSignUp && (
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
          {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
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
          {isSignUp && (
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
