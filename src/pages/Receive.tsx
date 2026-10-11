import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Button from "../components/Button";

export default function Receive() {
  const [alias, setAlias] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.getMe().then((m) => setAlias(m.alias));
    api.getWallet().then((w) => setAddress(w.address));
  }, []);

  return (
    <div className="space-y-4 p-6">
      <button onClick={() => navigate(-1)} className="text-brand">← Back</button>
      <h1 className="text-xl font-semibold">Receive money</h1>
      <div className="rounded-xl bg-white p-4">
        <p className="text-xs text-gray-500">Your Subtle Pay name</p>
        <p className="text-xl font-semibold">@{alias ?? "not set yet"}</p>
        <p className="text-xs text-gray-400">Senders can use this name to pay you.</p>
      </div>
      <div className="break-all rounded-xl bg-white p-4 text-sm">{address}</div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="light" onClick={() => navigator.clipboard.writeText(address)}>Copy address</Button>
        <Button variant="light" onClick={() => navigator.clipboard.writeText(alias ?? "")}>Copy name</Button>
      </div>
      <p className="rounded-xl bg-gray-100 p-3 text-sm text-gray-500">QR code coming soon</p>
    </div>
  );
}