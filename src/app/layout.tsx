import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser, signOut } from "./actions";

// Session-aware header: render at request time instead of prerendering a shell.
export const instant = false;

export const metadata: Metadata = {
  title: "Nitumee — Book a shopper, we shop for you",
  description:
    "Book a trusted runner to shop for you at the market or supermarket in Nairobi. Pick an area, a time slot and a budget.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Nitumee<span className="text-accent">.</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              {user ? (
                <>
                  <Link href={user.role === "runner" ? "/runner" : "/bookings"} className="btn-secondary !px-4 !py-2">
                    {user.role === "runner" ? "Runner queue" : "My bookings"}
                  </Link>
                  {user.role !== "runner" && (
                    <Link href="/book" className="btn !px-4 !py-2">
                      Book now
                    </Link>
                  )}
                  <span className="hidden text-stone-500 sm:inline">{user.name}</span>
                  <form action={signOut}>
                    <button className="rounded-lg px-3 py-2 text-stone-500 hover:text-stone-900">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn !px-4 !py-2">
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
          Nitumee · Shopping runs in Nairobi · Pay with M-Pesa
        </footer>
      </body>
    </html>
  );
}
