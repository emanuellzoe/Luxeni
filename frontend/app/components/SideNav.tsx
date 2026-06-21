"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Routes that make up the "app" experience. On these, the marketing top-bar
// (SiteNav) steps aside and this minimalist icon rail takes over.
export const APP_ROUTES = ["/app", "/leaderboard", "/profile"];

export const isAppRoute = (pathname: string | null) =>
  !!pathname && APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
    <path d="M10 19.5v-5h4v5" />
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7 11M17 6h3v1.5A3.5 3.5 0 0 1 17 11" />
    <path d="M9.5 13.5 9 17h6l-.5-3.5M8 20h8M10 17v3M14 17v3" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);

const ITEMS = [
  { href: "/app", label: "Home", Icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: TrophyIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

export function SideNav() {
  const pathname = usePathname();
  const active = isAppRoute(pathname);

  // Let the page shells reserve room for the fixed rail (and drop the top-bar
  // gap) only while the rail is actually mounted.
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("has-side-nav");
    return () => document.body.classList.remove("has-side-nav");
  }, [active]);

  if (!active) return null;

  return (
    <aside className="side-nav" aria-label="App">
      <Link href="/" className="rail-logo" title="Back to Luxeni">
        <span className="sigil">✦</span>
      </Link>

      <nav className="rail-links" aria-label="Sections">
        {ITEMS.map(({ href, label, Icon }) => {
          const on = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`rail-link${on ? " active" : ""}`}
              aria-label={label}
              aria-current={on ? "page" : undefined}
              title={label}
            >
              <Icon />
              <span className="rail-tip">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
