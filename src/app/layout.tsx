import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { signOut } from "./actions";
import { currentUser } from "@/lib/auth";

// Session-aware header: render at request time instead of prerendering a shell.
export const instant = false;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const title = "Nitumee — Book a shopper, we shop for you";
const description =
  "Book a trusted runner to shop for you at the market or supermarket in Nairobi. Pick an area, a time slot and a budget.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Nitumee",
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: "/images/og-nitumee.jpg",
        width: 1200,
        height: 630,
        alt: "A Nitumee runner handing fresh groceries to a customer at a Nairobi market",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/og-nitumee.jpg"],
  },
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
                  <Link
                    href={user.role === "admin" ? "/admin" : user.role === "runner" ? "/runner" : "/bookings"}
                    className="btn-secondary !px-4 !py-2"
                  >
                    {user.role === "admin" ? "Admin" : user.role === "runner" ? "Runner queue" : "My bookings"}
                  </Link>
                  {user.role === "customer" && (
                    <Link href="/book" className="btn !px-4 !py-2">
                      Book now
                    </Link>
                  )}
                  <Link href="/profile" className="hidden text-stone-500 hover:text-stone-900 sm:inline">
                    {user.name}
                  </Link>
                  <form action={signOut}>
                    <button className="rounded-lg px-3 py-2 text-stone-500 hover:text-stone-900">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-stone-600 hover:text-stone-900">
                    Sign in
                  </Link>
                  <Link href="/login?mode=signup" className="btn !px-4 !py-2">
                    Create account
                  </Link>
                </>
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
