import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import {
  SUPPORTED_EVM_NETWORKS,
  copyText,
  getChainLabel,
} from "../services/walletService";

export default function Receive({
  walletAddress = null,
  walletChainId = null,
  displayName = "",
  onConnectWallet,
}: {
  walletAddress?: string | null;
  walletChainId?: string | null;
  displayName?: string;
  onConnectWallet?: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState(() =>
    SUPPORTED_EVM_NETWORKS.find((network) => network.chainId === walletChainId?.toLowerCase())?.id ?? "monad"
  );

  useEffect(() => {
    const current = SUPPORTED_EVM_NETWORKS.find((network) => network.chainId === walletChainId?.toLowerCase());
    if (current) setSelectedNetworkId(current.id);
  }, [walletChainId]);

  const selectedNetwork = SUPPORTED_EVM_NETWORKS.find((network) => network.id === selectedNetworkId) ?? SUPPORTED_EVM_NETWORKS[0];
  const localHandle = useMemo(() => {
    const name = displayName.trim();
    if (!name || name.includes("@")) return name.toLowerCase();
    const first = name.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    return first ? `${first}@monad` : "";
  }, [displayName]);

  async function copyAddress() {
    if (!walletAddress) {
      setNotice("Connect your wallet to view its receiving address.");
      return;
    }
    try {
      await copyText(walletAddress);
      setNotice("Wallet address copied. Share the network name as well so the sender uses the correct chain.");
    } catch {
      setNotice("Copy is unavailable in this browser.");
    }
  }

  async function shareAddress() {
    if (!walletAddress) {
      setNotice("Connect your wallet to share your receiving address.");
      return;
    }
    const text = `Subtle Pay receiving address\nNetwork: ${selectedNetwork.label}\nAddress: ${walletAddress}`;
    try {
      if (navigator.share) await navigator.share({ title: "Subtle Pay receiving address", text });
      else {
        await copyText(text);
        setNotice("Sharing is unavailable in this browser; receiving details copied instead.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNotice("Couldn't open the share sheet. Copy the address and network instead.");
    }
  }

  return (
    <div className="page-stack inner-page receive-page">
      <div className="page-intro"><div><div className="section-kicker">INCOMING PAYMENTS</div><h1>Receive money</h1><p>Choose a network and share the connected wallet address.</p></div><span className="page-icon-bubble"><Icon name="receive" size={20} /></span></div>

      {!walletAddress ? (
        <section className="panel receive-wallet-connect">
          <span className="receive-wallet-icon"><Icon name="wallet" size={23} /></span>
          <h2>Connect your wallet</h2>
          <p>Your receiving address comes from the wallet you connect. Subtle Pay never creates or stores private keys.</p>
          {onConnectWallet && <button type="button" className="primary-button" onClick={onConnectWallet}><Icon name="wallet" size={16} /> Connect wallet</button>}
        </section>
      ) : (
        <>
          <section className="receive-hero-panel">
            <div className="receive-hero-copy"><span className="section-kicker light">YOUR WALLET</span><h2>Ready to <span>receive</span></h2><p>Use the exact network selected below. Receiving on another network does not bridge or move funds between chains.</p></div>
            <div className="receive-qr-box receive-network-icon"><Icon name="qr" size={42} /><span>{selectedNetwork.label.toUpperCase()}</span></div>
          </section>

          <section className="panel address-panel">
            <div className="panel-heading compact"><div><div className="section-kicker">RECEIVING NETWORK</div><h2>{selectedNetwork.label}</h2></div><span className="status-pill neutral">EVM</span></div>
            <label className="field-label" htmlFor="receive-network-select">Network</label>
            <select id="receive-network-select" className="form-select full-select" value={selectedNetworkId} onChange={(event) => { setSelectedNetworkId(event.target.value); setNotice(""); }}>
              {SUPPORTED_EVM_NETWORKS.map((network) => <option key={network.id} value={network.id}>{network.label}</option>)}
            </select>
            <div className="receive-address-label"><span>WALLET ADDRESS</span><button type="button" onClick={() => void copyAddress()}><Icon name="copy" size={14} /> Copy</button></div>
            <div className="receive-full-address" title={walletAddress}>{walletAddress}</div>
            <div className="receive-address-meta"><Icon name="shield" size={15} /><span>Connected address · {getChainLabel(walletChainId)}</span></div>
            <div className="button-row receive-action-row">
              <button type="button" className="primary-button" onClick={() => void copyAddress()}><Icon name="copy" size={16} /> Copy address</button>
              <button type="button" className="secondary-button" onClick={() => void shareAddress()}><Icon name="arrow-up-right" size={16} /> Share details</button>
            </div>
            {notice && <div className="inline-notice" role="status"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
          </section>

          <section className="panel receive-handle-panel">
            <div className="panel-heading compact"><div><div className="section-kicker">SUBTLE PAY HANDLE</div><h2>{localHandle || "Wallet 1"}</h2></div><span className="status-pill warning">Preview</span></div>
            <p>This is your local display label. Global handle search and resolving a name such as anirban@monad to a verified address need the Subtle Pay account-directory backend; don't send funds to a name alone yet.</p>
          </section>
        </>
      )}

      <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">INBOUND</div><h2>Incoming activity</h2></div><span className="small-muted">Recent</span></div>
        <div className="empty-activity"><Icon name="receive" size={21} /><strong>No incoming activity connected</strong><span>Incoming transaction history is not connected yet. A wallet balance refresh alone doesn't prove a payment's confirmation status.</span></div>
      </section>
    </div>
  );
}
