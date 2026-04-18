import Link from "next/link";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: "spark" | "pin" | "bell" | "heart" | "chart" | "box" | "truck" | "users";
};

type BottomNavProps = {
  activeHref: string;
  items: BottomNavItem[];
};

function NavIcon({
  icon,
  active,
}: {
  icon: BottomNavItem["icon"];
  active: boolean;
}) {
  const stroke = active ? "currentColor" : "rgba(75,53,40,0.72)";
  const shared = {
    fill: "none",
    stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  switch (icon) {
    case "spark":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="m12 3 1.9 4.9L19 9.8l-4.1 2.7 1.4 5L12 14.8 7.7 17.5l1.4-5L5 9.8l5.1-1.9Z" />
        </svg>
      );
    case "pin":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="M12 20s5-4.8 5-9a5 5 0 1 0-10 0c0 4.2 5 9 5 9Z" />
          <circle cx="12" cy="11" r="1.8" fill={stroke} />
        </svg>
      );
    case "bell":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="M8 18h8m-7-2V10a3 3 0 1 1 6 0v6l1.5 2H7.5Z" />
        </svg>
      );
    case "heart":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="M12 20s-6.5-4.2-6.5-9.3A3.8 3.8 0 0 1 9.3 7c1.2 0 2.1.4 2.7 1.2A3.3 3.3 0 0 1 14.7 7a3.8 3.8 0 0 1 3.8 3.7C18.5 15.8 12 20 12 20Z" />
        </svg>
      );
    case "chart":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="M5 19V9m7 10V5m7 14v-7" />
        </svg>
      );
    case "box":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="m4 8 8-4 8 4-8 4Zm0 0v8l8 4 8-4V8" />
        </svg>
      );
    case "truck":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="M3 7h11v8H3Zm11 2h3l2 2v4h-5" />
          <circle cx="8" cy="17" r="1.5" fill={stroke} />
          <circle cx="18" cy="17" r="1.5" fill={stroke} />
        </svg>
      );
    case "users":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path {...shared} d="M9 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7 1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM4.5 18a4.5 4.5 0 0 1 9 0m1.5 0a3.5 3.5 0 0 1 5 0" />
        </svg>
      );
  }
}

export function BottomNav({ activeHref, items }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <nav className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-[1.9rem] border border-white/70 bg-[rgba(255,248,240,0.88)] px-2 py-2 shadow-[0_22px_80px_rgba(54,30,16,0.14)] backdrop-blur sm:max-w-lg">
        {items.map((item) => {
          const active = item.href === activeHref;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.35rem] px-2 py-2 text-xs font-semibold tracking-[0.02em] transition-colors ${
                active
                  ? "bg-[#f75d36] text-white"
                  : "text-[#5b4638] hover:bg-white/70"
              }`}
            >
              <NavIcon icon={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
