import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/interview", label: "Interview" },
  { to: "/about", label: "About" },
];

export function AppLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-indigo-50/50 to-emerald-50/60 text-slate-900">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-sky-300/45 animate-glow" />
      <div className="pointer-events-none absolute right-[-90px] top-[-20px] h-80 w-80 rounded-full bg-violet-300/40 animate-glow" />
      <div className="pointer-events-none absolute bottom-[-60px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/35 animate-glow" />

      <header className="relative z-10 border-b border-white/70 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <NavLink to="/" className="text-xl font-extrabold tracking-tight text-sky-700 transition hover:text-sky-600">
            SkillCheck
          </NavLink>

          <nav className="flex items-center gap-2 rounded-2xl border border-sky-200/80 bg-white/80 p-1.5 shadow-sm shadow-sky-100">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-200"
                      : "text-slate-600 hover:bg-sky-100 hover:text-sky-700"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
