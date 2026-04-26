import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { useAuth } from "../hooks/AuthProvider";
import { useTheme } from "../hooks/useTheme";

export function Login() {
  const { loginWithEmail } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/interview";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithEmail({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail ?? "Could not sign in with these credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const panelClass = isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm shadow-slate-900/5";

  return (
    <section className="mx-auto max-w-lg">
      <div className={`rounded-3xl border p-6 sm:p-8 ${panelClass}`}>
        <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
          Sign in
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">Continue your interview practice.</h1>
        <p className={`mt-4 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Access your interview sessions and feedback with your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="grid gap-2 text-sm">
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`rounded-xl border px-3 py-3 outline-none ${
                isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              required
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`rounded-xl border px-3 py-3 outline-none ${
                isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              required
            />
          </label>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={`mt-5 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          New here?{" "}
          <Link to="/register" className={isDark ? "text-emerald-200" : "text-slate-900"}>
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
