import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { useAuth } from "../hooks/AuthProvider";
import { useTheme } from "../hooks/useTheme";

export function Register() {
  const { registerWithEmail } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await registerWithEmail(form);
      navigate("/interview", { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<Record<string, string[]>>;
      const data = axiosError.response?.data;
      const firstMessage = data ? Object.values(data)[0]?.[0] : null;
      setError(firstMessage ?? "Could not create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const panelClass = isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm shadow-slate-900/5";

  return (
    <section className="mx-auto max-w-lg">
      <div className={`rounded-3xl border p-6 sm:p-8 ${panelClass}`}>
        <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
          Create account
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">Start practicing with SkillCheck.</h1>
        <p className={`mt-4 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Create an account to save interview sessions and review your feedback.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>First name</span>
              <input
                type="text"
                value={form.first_name}
                onChange={(event) => handleChange("first_name", event.target.value)}
                className={`rounded-xl border px-3 py-3 outline-none ${
                  isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>Last name</span>
              <input
                type="text"
                value={form.last_name}
                onChange={(event) => handleChange("last_name", event.target.value)}
                className={`rounded-xl border px-3 py-3 outline-none ${
                  isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className={`rounded-xl border px-3 py-3 outline-none ${
                isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                className={`rounded-xl border px-3 py-3 outline-none ${
                  isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>Confirm password</span>
              <input
                type="password"
                value={form.password_confirm}
                onChange={(event) => handleChange("password_confirm", event.target.value)}
                className={`rounded-xl border px-3 py-3 outline-none ${
                  isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
                required
              />
            </label>
          </div>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className={`mt-5 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Already have an account?{" "}
          <Link to="/login" className={isDark ? "text-emerald-200" : "text-slate-900"}>
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
