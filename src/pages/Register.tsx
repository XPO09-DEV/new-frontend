import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/Button";
import Input from "../components/Input";

export default function Register() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const rules = [
    { text: "At least 8 characters", ok: password.length >= 8 },
    { text: "One number", ok: /\d/.test(password) },
    { text: "One uppercase letter", ok: /[A-Z]/.test(password) },
  ];
  const canSubmit = rules.every((rule) => rule.ok) && password === confirm && !loading;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const session = await api.register(password);
      login(session.token, session.refreshToken);
      setAccountId(session.accountId ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  if (accountId) {
    return (
      <div className="space-y-4 p-6 pt-24 text-center">
        <h1 className="text-2xl font-semibold">Your Subtle Pay ID</h1>
        <p className="text-sm text-gray-500">Keep it safe and do not share it with anyone.</p>
        <div className="break-all rounded-xl bg-soft p-4 font-mono">{accountId}</div>
        <Button variant="light" onClick={() => navigator.clipboard.writeText(accountId)}>Copy ID</Button>
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          Save this ID somewhere safe. You'll need it to log in.
        </p>
        <Button onClick={() => navigate("/", { replace: true })}>I've saved it</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 pt-16">
      <h1 className="text-2xl font-semibold">Create your Subtle Pay account</h1>
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
      <Input label="Confirm password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required />
      <ul className="space-y-1 text-sm">
        {rules.map((rule) => (
          <li key={rule.text} className={rule.ok ? "text-brand" : "text-gray-400"}>
            {rule.ok ? "✓" : "○"} {rule.text}
          </li>
        ))}
      </ul>
      {password !== confirm && confirm && <p className="text-sm text-red-600">Passwords do not match.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button onClick={submit} disabled={!canSubmit}>{loading ? "Creating account..." : "Create account"}</Button>
      <p className="text-center text-sm">
        Already have an account? <Link to="/login" className="text-brand">Log in</Link>
      </p>
    </div>
  );
}
