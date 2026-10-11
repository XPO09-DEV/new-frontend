import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/Button";
import Input from "../components/Input";

export default function Login() {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const session = await api.login(accountId.trim(), password);
      login(session.token, session.refreshToken);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-6 pt-24">
      <h1 className="text-center text-3xl font-bold text-brand">SUBTLE PAY</h1>
      <p className="pb-4 text-center text-sm text-gray-500">Simple money. Bigger possibilities.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Account ID"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          autoComplete="username"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="text-center text-sm">
        Don't have an account? <Link to="/register" className="text-brand">Create one</Link>
      </p>
    </div>
  );
}
