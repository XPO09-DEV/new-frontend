import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import type { WalletAsset } from "../services/walletService";
import { copyText, getChainLabel, getWalletAssetNetwork, isValidEvmAddress, sendEvmAssetTransaction } from "../services/walletService";

function fmt(n: number, decimals = 8) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: Math.min(decimals, n >= 1 ? 6 : 8) }).format(n);
}
function short(value: string) { return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value; }
const EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/", bnb: "https://bscscan.com/tx/", polygon: "https://polygonscan.com/tx/",
  arbitrum: "https://arbiscan.io/tx/", optimism: "https://optimistic.etherscan.io/tx/", base: "https://basescan.org/tx/",
  avalanche: "https://snowtrace.io/tx/", monad: "https://monadscan.com/tx/",
};

export default function Send({
  onBack, initialRecipient = "", walletAddress = null, walletChainId = null, walletAssets = [],
  onConnectWallet, onTransactionSubmitted,
}: {
  onBack: () => void; initialRecipient?: string; walletAddress?: string | null; walletChainId?: string | null;
  walletAssets?: WalletAsset[]; onConnectWallet?: () => void; onTransactionSubmitted?: () => void;
}) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [recipientChecked, setRecipientChecked] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  useEffect(() => {
    if (initialRecipient) { setRecipient(initialRecipient); setRecipientChecked(false); setReviewing(false); setTransactionHash(""); }
  }, [initialRecipient]);
  useEffect(() => {
    if (walletAssets.length && !walletAssets.some((asset) => asset.id === selectedAssetId)) setSelectedAssetId(walletAssets[0].id);
    if (!walletAssets.length) setSelectedAssetId("");
  }, [walletAssets, selectedAssetId]);

  const asset = walletAssets.find((item) => item.id === selectedAssetId) ?? null;
  const network = asset ? getWalletAssetNetwork(asset) : null;
  const typed = recipient.trim();
  const isHandle = typed.includes("@") && !typed.startsWith("0x");
  const validAddress = isValidEvmAddress(typed);
  const nAmount = Number(amount);
  const validAmount = amount.trim() !== "" && Number.isFinite(nAmount) && nAmount > 0;
  const enoughBalance = Boolean(asset && validAmount && nAmount <= asset.balance);
  const canReview = Boolean(walletAddress && asset && network && validAddress && enoughBalance && !submitting && !transactionHash);

  const compatibility = useMemo(() => {
    if (!asset) return "Connect a wallet with a supported asset to create a transfer.";
    if (!network) return `Sending from ${asset.chainLabel} is not supported yet. No transaction has been sent.`;
    if (!validAddress) return isHandle
      ? "Handle lookup is not connected. Use the recipient's verified wallet address until the Subtle Pay account-directory backend is available."
      : "Enter a valid EVM address beginning with 0x.";
    if (!validAmount) return "Enter an amount greater than zero.";
    if (nAmount > asset.balance) return `Your indexed balance is ${fmt(asset.balance, asset.tokenDecimals)} ${asset.tokenSymbol}.`;
    if (walletChainId && walletChainId.toLowerCase() !== network.chainId) {
      return `This direct transfer is compatible on ${network.label}. Your wallet is on ${getChainLabel(walletChainId)}; it must switch networks before the wallet can ask you to approve the transfer.`;
    }
    return `Direct same-chain transfer on ${network.label} is available for this asset. Your wallet will estimate gas and ask you to approve the transaction.`;
  }, [asset, network, validAddress, isHandle, validAmount, nAmount, walletChainId]);

  function checkRecipient() {
    setReviewing(false); setNotice(""); setTransactionHash(""); setRecipientChecked(true);
    if (isHandle) setNotice("Handle lookup needs the Subtle Pay account-directory backend. A local display name is not yet a globally registered or searchable account.");
    else if (!validAddress) setNotice("This does not look like a valid EVM address. No network lookup or transaction was performed.");
    else setNotice("Address format looks valid. This does not prove the address belongs to the intended person; verify it independently before sending.");
  }

  async function submitTransfer() {
    if (!asset || !walletAddress || !network || !validAddress || !enoughBalance) return;
    setSubmitting(true); setNotice("");
    try {
      const hash = await sendEvmAssetTransaction({ walletAddress, recipient: typed, asset, amount });
      setTransactionHash(hash);
      setReviewing(false);
      setNotice("Transaction submitted by your wallet. It may still be pending; submission does not guarantee confirmation.");
      onTransactionSubmitted?.();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The wallet could not submit the transaction.");
    } finally { setSubmitting(false); }
  }

  async function copyHash() {
    try { await copyText(transactionHash); setHashCopied(true); }
    catch { setNotice("Copy is unavailable in this browser."); }
  }

  return (
    <div className="page-stack inner-page send-page">
      <button className="back-link" type="button" onClick={onBack}><Icon name="arrow-left" size={17} /> Back to wallet</button>
      <div className="page-intro"><div><div className="section-kicker">ON-CHAIN PAYMENT</div><h1>Send money</h1><p>Review the network and recipient before you approve anything.</p></div><span className="page-icon-bubble"><Icon name="send" size={20} /></span></div>

      {!walletAddress ? (
        <section className="panel send-wallet-connect">
          <span className="send-connect-icon"><Icon name="wallet" size={23} /></span><h2>Connect your wallet</h2>
          <p>Subtle Pay does not hold funds or store private keys. Connect an EVM wallet to read your balance and request a transfer.</p>
          {onConnectWallet && <button type="button" className="primary-button" onClick={onConnectWallet}><Icon name="wallet" size={16} /> Connect wallet</button>}
        </section>
      ) : (
        <section className="panel send-panel">
          <div className="send-connected-line"><span className="send-connected-dot" /><div><strong>Wallet connected</strong><small>{short(walletAddress)} · {getChainLabel(walletChainId)}</small></div></div>

          <div className="step-heading"><span className="step-number">01</span><div><h2>Recipient</h2><p>Use a verified EVM address. Account-handle lookup is not connected yet.</p></div></div>
          <label className="field-label" htmlFor="recipient-identity">Recipient wallet address</label>
          <div className="input-with-icon">
            <Icon name="search" size={18} /><input id="recipient-identity" value={recipient}
              onChange={(event) => { setRecipient(event.target.value); setRecipientChecked(false); setReviewing(false); setTransactionHash(""); setNotice(""); }}
              placeholder="0x… recipient address" autoComplete="off" spellCheck={false} />
            {recipient && <button type="button" className="recipient-clear-button" onClick={() => { setRecipient(""); setRecipientChecked(false); setReviewing(false); setNotice(""); }} aria-label="Clear recipient"><Icon name="close" size={15} /></button>}
          </div>
          <button type="button" className="secondary-button send-inspect-button" onClick={checkRecipient}><Icon name="shield" size={16} /> Check address format</button>
          {recipientChecked && <div className={validAddress && !isHandle ? "recipient-check-state valid" : "recipient-check-state"}><Icon name={validAddress && !isHandle ? "check-circle" : "info"} size={16} /><span>{validAddress && !isHandle ? "Valid EVM address format — identity is not verified." : isHandle ? "Handle registry unavailable" : "Address format didn't pass validation."}</span></div>}

          <div className="step-heading send-step-heading"><span className="step-number">02</span><div><h2>Choose an asset you own</h2><p>The selected asset determines the network. A direct send does not bridge between chains.</p></div></div>
          <label className="field-label" htmlFor="send-asset-select">Wallet asset and network</label>
          <select id="send-asset-select" className="form-select full-select" value={selectedAssetId} onChange={(event) => { setSelectedAssetId(event.target.value); setReviewing(false); setNotice(""); setTransactionHash(""); }} disabled={!walletAssets.length}>
            {!walletAssets.length ? <option value="">No indexed balances were found</option> : walletAssets.map((item) => <option key={item.id} value={item.id}>{item.tokenSymbol} · {item.chainLabel} · {fmt(item.balance, item.tokenDecimals)}</option>)}
          </select>
          {asset && <div className="send-selected-asset">
            <span className="send-selected-asset-mark"><Icon name={asset.contractAddress ? "coins" : "wallet"} size={19} /></span>
            <span><strong>{asset.tokenName} ({asset.tokenSymbol})</strong><small>{asset.chainLabel} · {asset.contractAddress ? "Token contract" : "Native coin"}</small></span>
            <span className="send-balance-copy">{fmt(asset.balance, asset.tokenDecimals)}<small>available</small></span>
          </div>}

          <div className="step-heading send-step-heading"><span className="step-number">03</span><div><h2>Amount</h2><p>Network fees are paid separately in the chain's native coin.</p></div></div>
          <label className="field-label" htmlFor="send-amount">Amount to send</label>
          <div className="send-token-amount-row">
            <input id="send-amount" type="number" min="0" max={asset?.balance} step="any" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={(event) => { setAmount(event.target.value); setReviewing(false); setNotice(""); setTransactionHash(""); }} disabled={!asset} />
            <span>{asset?.tokenSymbol ?? "TOKEN"}</span>
            {asset && <button type="button" onClick={() => { setAmount(String(asset.balance)); setReviewing(false); setNotice(""); }} aria-label="Use full available balance">Max</button>}
          </div>
          {asset && validAmount && nAmount > asset.balance && <p className="send-validation-error">Amount exceeds your indexed balance.</p>}

          <div className={validAddress && network && enoughBalance ? "send-compatibility valid" : "send-compatibility"}>
            <span className="send-compatibility-icon"><Icon name={validAddress && network && enoughBalance ? "check-circle" : "info"} size={18} /></span>
            <div><strong>{network ? `Network compatibility · ${network.label}` : "Network compatibility"}</strong><p>{compatibility}</p></div>
          </div>
          <div className="send-safety-note"><Icon name="shield" size={17} /><p>Before prompting your wallet, Subtle Pay estimates gas and checks balances. Your wallet must approve network switching and the transaction. No key is stored by Subtle Pay.</p></div>

          {!reviewing && !transactionHash && <button type="button" className="primary-button wide-button" disabled={!canReview} onClick={() => { setNotice(""); setReviewing(true); }}><Icon name="document" size={16} /> Review transfer</button>}
          {reviewing && asset && network && <section className="send-review-card" aria-label="Transfer review">
            <div className="send-review-head"><span className="section-kicker">FINAL REVIEW</span><strong>Confirm every detail</strong></div>
            <div className="send-review-amount">{fmt(nAmount, asset.tokenDecimals)} <span>{asset.tokenSymbol}</span></div>
            <div className="send-review-row"><span>Network</span><strong>{network.label}</strong></div>
            <div className="send-review-row"><span>Recipient</span><code title={typed}>{short(typed)}</code></div>
            <div className="send-review-row"><span>Asset</span><strong>{asset.tokenName}</strong></div>
            <p>Nothing is sent until you approve it in your wallet. A direct send only delivers this asset on {network.label}; it cannot transfer value across blockchains.</p>
            <div className="send-review-actions"><button type="button" className="secondary-button" onClick={() => setReviewing(false)} disabled={submitting}>Edit details</button><button type="button" className="primary-button" onClick={() => void submitTransfer()} disabled={submitting}>{submitting ? "Waiting for wallet…" : "Confirm in wallet"}</button></div>
          </section>}

          {transactionHash && network && <section className="send-success-state" role="status">
            <span><Icon name="check-circle" size={22} /></span><div><strong>Transaction submitted</strong><p>Submission does not guarantee confirmation. Check the transaction status on the explorer.</p></div>
            <code>{short(transactionHash)}</code>
            <div className="send-review-actions"><button type="button" className="secondary-button" onClick={() => void copyHash()}><Icon name="copy" size={15} /> {hashCopied ? "Copied" : "Copy hash"}</button>{EXPLORERS[network.id] && <a className="primary-button" href={`${EXPLORERS[network.id]}${transactionHash}`} target="_blank" rel="noreferrer"><Icon name="arrow-up-right" size={15} /> View transaction</a>}</div>
          </section>}

          {notice && <div className="inline-notice" role="status"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
        </section>
      )}
      <section className="panel send-route-info"><div className="section-kicker">IMPORTANT</div><h2>Same-chain transfers only</h2><p>A 0x address can exist on more than one EVM network, but a transfer on Ethereum is not delivered to Monad. Cross-chain payments need a verified bridge or exchange route, which is not integrated here.</p></section>
    </div>
  );
}
