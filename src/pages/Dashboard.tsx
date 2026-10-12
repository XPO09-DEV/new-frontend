import { useEffect, useMemo, useState } from "react";
import type { PageId } from "../components/BottomNav";
import Icon from "../components/Icon";
import WalletCard from "../components/WalletCard";
import TokenAssetsWidget from "../components/TokenAssetsWidget";
import type { WalletAsset, WalletStatus } from "../services/walletService";

type SavedContact = {
  id: string;
  name: string;
  recipient: string;
};

type ContactPickerRecord = {
  name?: string[];
  tel?: string[];
};

const CONTACTS_STORAGE_KEY = "subtlePayContacts";

function readSavedContacts(): SavedContact[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CONTACTS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedContact =>
      typeof item?.id === "string" &&
      typeof item?.name === "string" &&
      typeof item?.recipient === "string" &&
      item.name.trim().length > 0 &&
      item.recipient.trim().length > 0
    );
  } catch {
    return [];
  }
}

function walletGreeting(displayName: string) {
  const name = displayName.trim();
  if (!name) return "Wallet 1";
  if (name.includes("@")) return name.toLowerCase();
  const firstName = name.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return firstName ? `${firstName}@monad` : "Wallet 1";
}

function contactInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "•";
}

function normalizeRecipient(recipient: string) {
  return recipient.trim().toLowerCase();
}

export default function Dashboard({
  selectedToken,
  onTokenChange,
  onNavigate,
  onSendToContact,
  displayName,
  onDisplayNameChange,
  walletAddress,
  walletChainId,
  walletAssets,
  walletStatus,
  walletError,
  onConnectWallet,
  onCopyAddress,
  onDisconnectWallet,
}: {
  selectedToken: string;
  onTokenChange: (token: string) => void;
  onNavigate: (page: PageId) => void;
  onSendToContact: (recipient: string) => void;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  walletAddress: string | null;
  walletChainId: string | null;
  walletAssets: WalletAsset[];
  walletStatus: WalletStatus;
  walletError: string | null;
  onConnectWallet: () => void;
  onCopyAddress: () => void;
  onDisconnectWallet: () => void;
}) {
  const [contacts, setContacts] = useState<SavedContact[]>(readSavedContacts);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [showContacts, setShowContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRecipient, setContactRecipient] = useState("");
  const [contactNotice, setContactNotice] = useState("");
  const [isImportingContacts, setIsImportingContacts] = useState(false);

  const quickActions: { page: PageId | "contacts"; label: string; icon: "send" | "receive" | "merchant" | "users" }[] = [
    { page: "send", label: "Send", icon: "send" },
    { page: "receive", label: "Receive", icon: "receive" },
    { page: "merchant", label: "Merchant", icon: "merchant" },
    { page: "contacts", label: "Contacts", icon: "users" },
  ];

  useEffect(() => {
    try {
      window.localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    } catch {
      setContactNotice("Contacts could not be saved in this browser.");
    }
  }, [contacts]);

  useEffect(() => {
    const syncContacts = () => setContacts(readSavedContacts());
    window.addEventListener("storage", syncContacts);
    return () => window.removeEventListener("storage", syncContacts);
  }, []);

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      `${contact.name} ${contact.recipient}`.toLowerCase().includes(query)
    );
  }, [contactSearch, contacts]);

  function addContact(event: { preventDefault: () => void }) {
    event.preventDefault();
    const name = contactName.trim();
    const recipient = contactRecipient.trim();
    if (!name || !recipient) {
      setContactNotice("Enter both a contact name and a phone number, wallet address or handle.");
      return;
    }
    if (contacts.some((contact) => normalizeRecipient(contact.recipient) === normalizeRecipient(recipient))) {
      setContactNotice("That recipient is already in your contacts.");
      return;
    }
    setContacts((current) => [...current, { id: `contact-${Date.now()}`, name, recipient }]);
    setContactName("");
    setContactRecipient("");
    setShowAddContact(false);
    setContactNotice("Contact saved.");
  }

  async function importDeviceContacts() {
    const contactNavigator = navigator as Navigator & {
      contacts?: {
        select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactPickerRecord[]>;
      };
    };
    if (!contactNavigator.contacts?.select) {
      setContactNotice("Device contact import is not supported in this browser. Choose Add contact instead.");
      return;
    }

    setIsImportingContacts(true);
    setContactNotice("");
    try {
      const selected = await contactNavigator.contacts.select(["name", "tel"], { multiple: true });
      const imported = selected.flatMap((item, index): SavedContact[] => {
        const recipient = item.tel?.find((value) => value.trim())?.trim();
        if (!recipient) return [];
        const name = item.name?.find((value) => value.trim())?.trim() || recipient;
        return [{ id: `device-${Date.now()}-${index}`, name, recipient }];
      });
      const seen = new Set(contacts.map((contact) => normalizeRecipient(contact.recipient)));
      const additions = imported.filter((contact) => {
        const key = normalizeRecipient(contact.recipient);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (additions.length === 0) {
        setContactNotice("No new contacts with phone numbers were selected.");
        return;
      }
      setContacts((current) => {
        const currentRecipients = new Set(current.map((contact) => normalizeRecipient(contact.recipient)));
        return [...current, ...additions.filter((contact) => {
          const key = normalizeRecipient(contact.recipient);
          if (currentRecipients.has(key)) return false;
          currentRecipients.add(key);
          return true;
        })];
      });
      setContactNotice(`${additions.length} contact${additions.length === 1 ? "" : "s"} imported.`);
    } catch {
      setContactNotice("Contact import was cancelled or unavailable. You can add a contact manually.");
    } finally {
      setIsImportingContacts(false);
    }
  }

  return (
    <div className="page-stack dashboard-page">
      <div className="page-intro wallet-greeting-intro">
        <h1 className="wallet-greeting">{walletGreeting(displayName)}</h1>
        <button type="button" className="wallet-name-edit" aria-label="Edit wallet display name" title="Edit wallet name" onClick={() => { setNameInput(displayName); setShowNameEditor((open) => !open); }}>
          <Icon name="settings" size={15} />
        </button>
      </div>
      {showNameEditor && (
        <form className="wallet-name-editor" onSubmit={(event) => { event.preventDefault(); onDisplayNameChange(nameInput.trim()); setShowNameEditor(false); }}>
          <label htmlFor="wallet-display-name">Wallet display name</label>
          <input id="wallet-display-name" value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Wallet 1 or Anirban Sarkar" maxLength={80} autoComplete="nickname" />
          <p>A name like “Anirban Sarkar” displays as anirban@monad. Leave it blank to use Wallet 1.</p>
          <div><button type="button" className="secondary-button" onClick={() => { setNameInput(""); onDisplayNameChange(""); setShowNameEditor(false); }}>Use Wallet 1</button><button type="submit" className="primary-button">Save name</button></div>
        </form>
      )}

      <WalletCard
        selectedToken={selectedToken}
        onTokenChange={onTokenChange}
        walletAddress={walletAddress}
        walletAssets={walletAssets}
        walletStatus={walletStatus}
        walletError={walletError}
        onConnectWallet={onConnectWallet}
        onCopyAddress={onCopyAddress}
        onDisconnectWallet={onDisconnectWallet}
      />

      <section className="quick-actions-section" aria-label="Wallet actions">
        <div className="quick-action-grid">
          {quickActions.map((action) => (
            <button className="quick-action" key={action.page} onClick={() => action.page === "contacts" ? setShowContacts(true) : onNavigate(action.page)} type="button">
              <span className="quick-action-icon"><Icon name={action.icon} size={22} /></span>
              <span className="quick-action-copy"><strong>{action.label}</strong></span>
            </button>
          ))}
        </div>
      </section>

      {showContacts && <div className="contacts-modal-backdrop" role="presentation" onClick={() => setShowContacts(false)}><section className="contacts-section panel contacts-modal" aria-labelledby="contacts-heading" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="contacts-header">
          <div>
            <div className="section-kicker">PAYMENTS</div>
            <h2 id="contacts-heading">Contacts</h2>
            <p>{contacts.length} saved {contacts.length === 1 ? "contact" : "contacts"}</p>
          </div>
          <div className="contacts-header-actions"><button className="contacts-add-button" type="button" onClick={() => { setShowAddContact((open) => !open); setContactNotice(""); }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {showAddContact ? "Close" : "Add contact"}
          </button><button className="contacts-close-button" type="button" onClick={() => setShowContacts(false)} aria-label="Close contacts"><Icon name="close" size={17} /></button></div>
        </div>

        <div className="contacts-toolbar">
          <label className="contacts-search">
            <Icon name="search" size={17} />
            <input aria-label="Search contacts" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Search contacts" />
          </label>
          <button className="contacts-import-button" type="button" disabled={isImportingContacts} onClick={importDeviceContacts}>
            <Icon name="smartphone" size={16} />
            {isImportingContacts ? "Importing…" : "Import"}
          </button>
        </div>

        {contactNotice && <p className="contacts-notice" role="status">{contactNotice}</p>}

        {showAddContact && (
          <form className="contact-add-form" onSubmit={addContact}>
            <label className="contact-form-field">
              <span>Name</span>
              <input className="text-input" value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Contact name" autoComplete="name" required />
            </label>
            <label className="contact-form-field">
              <span>Phone, wallet address or handle</span>
              <input className="text-input" value={contactRecipient} onChange={(event) => setContactRecipient(event.target.value)} placeholder="Phone number or @handle" autoComplete="off" required />
            </label>
            <button className="primary-button contact-save-button" type="submit">Save contact</button>
          </form>
        )}

        {contacts.length === 0 ? (
          <div className="contacts-empty">
            <span className="contacts-empty-icon"><Icon name="user" size={21} /></span>
            <strong>No contacts yet</strong>
            <span>Add contacts manually or import them from your device. Saved contacts will appear here.</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="contacts-empty compact">
            <strong>No matching contacts</strong>
            <span>Try another name, phone number or handle.</span>
          </div>
        ) : (
          <div className="contacts-list">
            {filteredContacts.map((contact) => (
              <article className="contact-row" key={contact.id}>
                <span className="avatar-initials contact-avatar">{contactInitials(contact.name)}</span>
                <span className="recipient-copy contact-copy">
                  <strong>{contact.name}</strong>
                  <small>{contact.recipient}</small>
                </span>
                <button className="contact-send-button" type="button" onClick={() => onSendToContact(contact.recipient)} aria-label={`Send to ${contact.name}`}>
                  <Icon name="send" size={15} /><span>Send</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section></div>}

      <TokenAssetsWidget
        apiKey={import.meta.env.VITE_COINGECKO_API_KEY}
        visibleHeld={3}
        walletConnected={Boolean(walletAddress)}
        pinned={walletAddress ? [] : undefined}
        holdings={walletAssets.map((asset) => ({
          id: asset.id,
          amount: asset.balance,
          symbol: asset.tokenSymbol,
          name: asset.tokenName,
          image: asset.thumbnail,
          price: asset.priceUsd,
          valueUsd: asset.balanceUsd,
          network: asset.chainLabel,
          contractAddress: asset.contractAddress,
        }))}
      />
      <div className="mobile-nav-spacer" />
    </div>
  );
}
