export type TokenSymbol = "ETH" | "BTC" | "SOL" | "MON";

export type TokenInfo = {
  symbol: TokenSymbol;
  name: string;
  quantity: string;
  priceUsd: number;
  valueUsd: string;
  outgoing: string;
  incoming: string;
  color: string;
};

export const TOKENS: Record<TokenSymbol, TokenInfo> = {
  ETH: { symbol: "ETH", name: "Ethereum", quantity: "4.2861", priceUsd: 3000, valueUsd: "$12,858.30", outgoing: "$1,240.00", incoming: "$3,840.00", color: "#8da9ff" },
  BTC: { symbol: "BTC", name: "Bitcoin", quantity: "0.08341", priceUsd: 65000, valueUsd: "$5,421.65", outgoing: "$760.00", incoming: "$2,100.00", color: "#f4b35e" },
  SOL: { symbol: "SOL", name: "Solana", quantity: "28.641", priceUsd: 140, valueUsd: "$4,009.74", outgoing: "$340.00", incoming: "$1,120.00", color: "#8bdac3" },
  MON: { symbol: "MON", name: "Monad", quantity: "1,250.00", priceUsd: 0.8, valueUsd: "$1,000.00", outgoing: "$125.00", incoming: "$450.00", color: "#d1a3ff" },
};

export type FiatCurrency = { code: string; name: string; demoUsdPerUnit: number };

export const FIAT_CURRENCIES: FiatCurrency[] = [
  { code: "INR", name: "Indian rupee", demoUsdPerUnit: 0.012 }, { code: "USD", name: "US dollar", demoUsdPerUnit: 1 }, { code: "EUR", name: "Euro", demoUsdPerUnit: 1.08 }, { code: "GBP", name: "Pound sterling", demoUsdPerUnit: 1.27 },
  { code: "JPY", name: "Japanese yen", demoUsdPerUnit: 0.0067 }, { code: "AUD", name: "Australian dollar", demoUsdPerUnit: 0.66 }, { code: "CAD", name: "Canadian dollar", demoUsdPerUnit: 0.74 }, { code: "CHF", name: "Swiss franc", demoUsdPerUnit: 1.11 },
  { code: "CNY", name: "Chinese yuan", demoUsdPerUnit: 0.14 }, { code: "HKD", name: "Hong Kong dollar", demoUsdPerUnit: 0.128 }, { code: "SGD", name: "Singapore dollar", demoUsdPerUnit: 0.74 }, { code: "NZD", name: "New Zealand dollar", demoUsdPerUnit: 0.61 },
  { code: "AED", name: "UAE dirham", demoUsdPerUnit: 0.272 }, { code: "SAR", name: "Saudi riyal", demoUsdPerUnit: 0.267 }, { code: "QAR", name: "Qatari riyal", demoUsdPerUnit: 0.275 }, { code: "KWD", name: "Kuwaiti dinar", demoUsdPerUnit: 3.25 },
  { code: "BHD", name: "Bahraini dinar", demoUsdPerUnit: 2.65 }, { code: "OMR", name: "Omani rial", demoUsdPerUnit: 2.6 }, { code: "THB", name: "Thai baht", demoUsdPerUnit: 0.028 }, { code: "MYR", name: "Malaysian ringgit", demoUsdPerUnit: 0.21 },
  { code: "IDR", name: "Indonesian rupiah", demoUsdPerUnit: 0.000063 }, { code: "PHP", name: "Philippine peso", demoUsdPerUnit: 0.018 }, { code: "KRW", name: "South Korean won", demoUsdPerUnit: 0.00074 }, { code: "VND", name: "Vietnamese dong", demoUsdPerUnit: 0.00004 },
  { code: "PKR", name: "Pakistani rupee", demoUsdPerUnit: 0.0036 }, { code: "BDT", name: "Bangladeshi taka", demoUsdPerUnit: 0.0091 }, { code: "LKR", name: "Sri Lankan rupee", demoUsdPerUnit: 0.0033 }, { code: "NPR", name: "Nepalese rupee", demoUsdPerUnit: 0.0075 },
  { code: "ZAR", name: "South African rand", demoUsdPerUnit: 0.055 }, { code: "NGN", name: "Nigerian naira", demoUsdPerUnit: 0.00065 }, { code: "KES", name: "Kenyan shilling", demoUsdPerUnit: 0.0077 }, { code: "GHS", name: "Ghanaian cedi", demoUsdPerUnit: 0.067 },
  { code: "EGP", name: "Egyptian pound", demoUsdPerUnit: 0.020 }, { code: "MAD", name: "Moroccan dirham", demoUsdPerUnit: 0.10 }, { code: "TND", name: "Tunisian dinar", demoUsdPerUnit: 0.32 }, { code: "TRY", name: "Turkish lira", demoUsdPerUnit: 0.031 },
  { code: "PLN", name: "Polish złoty", demoUsdPerUnit: 0.25 }, { code: "CZK", name: "Czech koruna", demoUsdPerUnit: 0.043 }, { code: "HUF", name: "Hungarian forint", demoUsdPerUnit: 0.0028 }, { code: "RON", name: "Romanian leu", demoUsdPerUnit: 0.22 },
  { code: "BGN", name: "Bulgarian lev", demoUsdPerUnit: 0.55 }, { code: "SEK", name: "Swedish krona", demoUsdPerUnit: 0.095 }, { code: "NOK", name: "Norwegian krone", demoUsdPerUnit: 0.094 }, { code: "DKK", name: "Danish krone", demoUsdPerUnit: 0.145 },
  { code: "ISK", name: "Icelandic króna", demoUsdPerUnit: 0.0072 }, { code: "MXN", name: "Mexican peso", demoUsdPerUnit: 0.059 }, { code: "BRL", name: "Brazilian real", demoUsdPerUnit: 0.20 }, { code: "ARS", name: "Argentine peso", demoUsdPerUnit: 0.0011 },
  { code: "CLP", name: "Chilean peso", demoUsdPerUnit: 0.0011 }, { code: "COP", name: "Colombian peso", demoUsdPerUnit: 0.00025 }, { code: "PEN", name: "Peruvian sol", demoUsdPerUnit: 0.27 }, { code: "UYU", name: "Uruguayan peso", demoUsdPerUnit: 0.025 },
  { code: "ILS", name: "Israeli new shekel", demoUsdPerUnit: 0.27 }, { code: "JOD", name: "Jordanian dinar", demoUsdPerUnit: 1.41 }, { code: "LBP", name: "Lebanese pound", demoUsdPerUnit: 0.000011 }, { code: "UAH", name: "Ukrainian hryvnia", demoUsdPerUnit: 0.024 },
  { code: "RUB", name: "Russian ruble", demoUsdPerUnit: 0.011 }, { code: "KZT", name: "Kazakhstani tenge", demoUsdPerUnit: 0.0021 }, { code: "UZS", name: "Uzbekistani so'm", demoUsdPerUnit: 0.000079 }, { code: "GEL", name: "Georgian lari", demoUsdPerUnit: 0.37 },
  { code: "AZN", name: "Azerbaijani manat", demoUsdPerUnit: 0.59 }, { code: "AMD", name: "Armenian dram", demoUsdPerUnit: 0.0026 }, { code: "ETB", name: "Ethiopian birr", demoUsdPerUnit: 0.0088 }, { code: "TZS", name: "Tanzanian shilling", demoUsdPerUnit: 0.00039 },
  { code: "UGX", name: "Ugandan shilling", demoUsdPerUnit: 0.00027 }, { code: "XOF", name: "West African CFA franc", demoUsdPerUnit: 0.00165 }, { code: "XAF", name: "Central African CFA franc", demoUsdPerUnit: 0.00165 }, { code: "XCD", name: "East Caribbean dollar", demoUsdPerUnit: 0.37 },
  { code: "JMD", name: "Jamaican dollar", demoUsdPerUnit: 0.0064 }, { code: "TTD", name: "Trinidad and Tobago dollar", demoUsdPerUnit: 0.147 }, { code: "DOP", name: "Dominican peso", demoUsdPerUnit: 0.017 }, { code: "CRC", name: "Costa Rican colón", demoUsdPerUnit: 0.0019 },
  { code: "BOB", name: "Bolivian boliviano", demoUsdPerUnit: 0.145 }, { code: "PYG", name: "Paraguayan guaraní", demoUsdPerUnit: 0.00013 },
];

export type DemoRecipient = { id: string; name: string; handle: string; address: string; initials: string };

export const DEMO_RECIPIENTS: DemoRecipient[] = [
  { id: "r1", name: "Anirban Sarkar", handle: "ani@monad", address: "0x8A73…31C2", initials: "AS" },
  { id: "r2", name: "Emon Hossain", handle: "emon@monad", address: "0x2F41…9D07", initials: "EH" },
  { id: "r3", name: "Mira Das", handle: "mira@monad", address: "0xBB52…7A1F", initials: "MD" },
];

export const DEMO_TRANSACTIONS = [
  { id: "demo-001", name: "Coffee & Co.", detail: "Merchant payment · 2h ago", amount: "−₹420.00", direction: "outgoing" as const, status: "Illustrative", token: "ETH" },
  { id: "demo-002", name: "Emon Hossain", detail: "Incoming transfer · Yesterday", amount: "+₹1,500.00", direction: "incoming" as const, status: "Illustrative", token: "MON" },
  { id: "demo-003", name: "Mira Das", detail: "Sent · 2 days ago", amount: "−₹800.00", direction: "outgoing" as const, status: "Illustrative", token: "SOL" },
];

export const DEMO_FX = [
  { pair: "USD / INR", value: "₹83.24", change: "+0.18%" },
  { pair: "EUR / INR", value: "₹90.15", change: "−0.06%" },
  { pair: "GBP / INR", value: "₹105.75", change: "+0.22%" },
  { pair: "USD / JPY", value: "¥149.82", change: "+0.09%" },
];

export type InvoiceDraft = {
  recipientName: string;
  recipientHandle: string;
  recipientAddress: string;
  amount: string;
  currency: string;
  token: string;
  tokenAmount: string;
  exchangeRate: string;
  fee: string;
  senderAddress: string;
  createdAtLabel: string;
};

export const formatFiat = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
