import { useState, type FormEvent } from "react";
import {
  getAccountProfile,
  loginAccount,
  registerAccount,
  type AccountProfile,
} from "../services/accountService";
import "./AccountGate.css";

type Mode = "login" | "register";

export default function AccountGate({ onAuthenticated }: { onAuthenticated: (profile: AccountProfile) => void }) {
  const [mode, setMode] = useState<Mode>("register");
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [createdAddress, setCreatedAddress] = useState("");
  const [createdProfile, setCreatedProfile] = useState<AccountProfile | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const result = await registerAccount(password);
        const profile = await getAccountProfile();
        setCreatedId(result.accountId);
        setCreatedAddress(result.walletAddress);
        setCreatedProfile(profile);
      } else {
        await loginAccount(accountId, password);
        const profile = await getAccountProfile();
        onAuthenticated(profile);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The account request failed. Check that the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAccountId() {
    try {
      await navigator.clipboard.writeText(createdId);
      setCopied(true);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the account ID manually.");
    }
  }

  if (createdProfile) {
    return (
      <main className="account-gate">
        <section className="account-gate-card account-created-card">
          <div className="account-gate-brand"><span className="account-gate-mark">S</span><span>Subtle Pay</span></div>
          <span className="account-gate-eyebrow">ACCOUNT CREATED</span>
          <h1>You're ready to start.</h1>
          <p className="account-gate-muted">Save this account ID. You'll need it with your password whenever you sign in. It cannot be recovered by email in this hackathon build.</p>
          <div className="account-id-box"><code>{createdId}</code><button type="button" onClick={() => void copyAccountId()}>{copied ? "Copied" : "Copy ID"}</button></div>
          <div className="account-wallet-box"><span>Monad Testnet receiving address</span><code>{createdAddress}</code></div>
          <div className="account-testnet-note">Hackathon mode · Testnet MON only · Test tokens have no cash value.</div>
          {error && <p className="account-gate-error" role="alert">{error}</p>}
          <button className="account-gate-primary" type="button" onClick={() => onAuthenticated(createdProfile)}>Continue to wallet</button>
        </section>
      </main>
    );
  }

  return (
    <main className="account-gate">
      <section className="account-gate-card">
        <div className="account-gate-brand"><span className="account-gate-mark">S</span><span>Subtle Pay</span></div>
        <span className="account-gate-eyebrow">MONAD TESTNET · HACKATHON</span>
        <h1>{mode === "register" ? "Create your account" : "Welcome back"}</h1>
        <p className="account-gate-muted">{mode === "register" ? "Create a Subtle Pay account and a dedicated testnet wallet. Your password is never shown again." : "Sign in with the account ID you saved when registering."}</p>
        <div className="account-gate-tabs">
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === "login" && <label className="account-gate-label">Account ID<input value={accountId} onChange={(event) => setAccountId(event.target.value)} minLength={10} maxLength={40} autoComplete="username" required placeholder="Your Subtle Pay account ID" /></label>}
          <label className="account-gate-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 12 : 1} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} required placeholder={mode === "register" ? "At least 12 characters" : "Your password"} /></label>
          {mode === "register" && <p className="account-gate-hint">Keep your password private. Subtle Pay creates an account ID and a backend-managed wallet for this testnet prototype.</p>}
          {error && <p className="account-gate-error" role="alert">{error}</p>}
          <button className="account-gate-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="account-gate-disclaimer">No mainnet transactions. Only testnet assets are intended for this demo.</p>
      </section>
    </main>
  );
}
