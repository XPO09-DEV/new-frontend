import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { Me } from "../types/api";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import Input from "../components/Input";
import CurrencyPicker from "../components/CurrencyPicker";

export default function Settings() {
  const [me, setMe] = useState<Me | null>(null);
  const [alias, setAlias] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    let active = true;
    api.getMe().then((value) => { if (active) setMe(value); }).catch((cause) => {
      if (active) setMsg(cause instanceof Error ? cause.message : "Could not load settings.");
    });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setLoading(true);
    setMsg("");
    try {
      await action();
      setMsg(successMessage);
      setMe(await api.getMe());
    } catch (cause) {
      setMsg(cause instanceof Error ? cause.message : "That change could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-5 pb-24">
      <h1 className="text-center text-lg font-semibold">Settings</h1>
      <div className="break-all rounded-xl bg-white p-4 text-sm">
        <b>@{me?.alias ?? "no name yet"}</b>
        <p className="text-gray-400">{me?.accountId}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-500">Display currency</p>
        <CurrencyPicker
          className="w-full"
          value={me?.currency ?? "USD"}
          onChange={(currency) => void run(() => api.setCurrency(currency), "Currency updated")}
        />
      </div>

      <Input label="Choose a name (alias)" value={alias} onChange={(event) => setAlias(event.target.value)} autoComplete="off" />
      <Button variant="light" disabled={loading || !alias.trim()} onClick={() => void run(() => api.setAlias(alias.trim()), "Name saved")}>Save name</Button>

      <Input label="Old password" type="password" value={oldPw} onChange={(event) => setOldPw(event.target.value)} autoComplete="current-password" />
      <Input label="New password" type="password" value={newPw} onChange={(event) => setNewPw(event.target.value)} autoComplete="new-password" />
      <Button
        variant="light"
        disabled={loading || !oldPw || !newPw}
        onClick={() => void run(() => api.changePassword(oldPw, newPw), "Password changed")}
      >
        Change password
      </Button>

      {msg && <p role="status" className="text-center text-sm text-gray-600">{msg}</p>}
      <Button variant="danger" onClick={logout}>Log out</Button>
      <BottomNav />
    </div>
  );
}
