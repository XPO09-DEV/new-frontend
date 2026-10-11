export type TokenSymbol = "ETH" | "BTC" | "SOL" | "MON";

export type TokenInfo = {
  symbol: TokenSymbol;
  name: string;
  color: string;
};

export const TOKENS: Record<TokenSymbol, TokenInfo> = {
  ETH: { symbol: "ETH", name: "Ethereum", color: "#8da9ff" },
  BTC: { symbol: "BTC", name: "Bitcoin", color: "#f4b35e" },
  SOL: { symbol: "SOL", name: "Solana", color: "#8bdac3" },
  MON: { symbol: "MON", name: "Monad", color: "#d1a3ff" },
};

export type FiatCurrency = {
  code: string;
  name: string;
};

export const FIAT_CURRENCIES: FiatCurrency[] = [
  { code: "INR", name: "Indian rupee" }, { code: "USD", name: "US dollar" }, { code: "EUR", name: "Euro" }, { code: "GBP", name: "Pound sterling" },
  { code: "JPY", name: "Japanese yen" }, { code: "AUD", name: "Australian dollar" }, { code: "CAD", name: "Canadian dollar" }, { code: "CHF", name: "Swiss franc" },
  { code: "CNY", name: "Chinese yuan" }, { code: "HKD", name: "Hong Kong dollar" }, { code: "SGD", name: "Singapore dollar" }, { code: "NZD", name: "New Zealand dollar" },
  { code: "AED", name: "UAE dirham" }, { code: "SAR", name: "Saudi riyal" }, { code: "QAR", name: "Qatari riyal" }, { code: "KWD", name: "Kuwaiti dinar" },
  { code: "BHD", name: "Bahraini dinar" }, { code: "OMR", name: "Omani rial" }, { code: "THB", name: "Thai baht" }, { code: "MYR", name: "Malaysian ringgit" },
  { code: "IDR", name: "Indonesian rupiah" }, { code: "PHP", name: "Philippine peso" }, { code: "KRW", name: "South Korean won" }, { code: "VND", name: "Vietnamese dong" },
  { code: "PKR", name: "Pakistani rupee" }, { code: "BDT", name: "Bangladeshi taka" }, { code: "LKR", name: "Sri Lankan rupee" }, { code: "NPR", name: "Nepalese rupee" },
  { code: "ZAR", name: "South African rand" }, { code: "NGN", name: "Nigerian naira" }, { code: "KES", name: "Kenyan shilling" }, { code: "GHS", name: "Ghanaian cedi" },
  { code: "EGP", name: "Egyptian pound" }, { code: "MAD", name: "Moroccan dirham" }, { code: "TND", name: "Tunisian dinar" }, { code: "TRY", name: "Turkish lira" },
  { code: "PLN", name: "Polish złoty" }, { code: "CZK", name: "Czech koruna" }, { code: "HUF", name: "Hungarian forint" }, { code: "RON", name: "Romanian leu" },
  { code: "BGN", name: "Bulgarian lev" }, { code: "SEK", name: "Swedish krona" }, { code: "NOK", name: "Norwegian krone" }, { code: "DKK", name: "Danish krone" },
  { code: "ISK", name: "Icelandic króna" }, { code: "MXN", name: "Mexican peso" }, { code: "BRL", name: "Brazilian real" }, { code: "ARS", name: "Argentine peso" },
  { code: "CLP", name: "Chilean peso" }, { code: "COP", name: "Colombian peso" }, { code: "PEN", name: "Peruvian sol" }, { code: "UYU", name: "Uruguayan peso" },
  { code: "ILS", name: "Israeli new shekel" }, { code: "JOD", name: "Jordanian dinar" }, { code: "LBP", name: "Lebanese pound" }, { code: "UAH", name: "Ukrainian hryvnia" },
  { code: "RUB", name: "Russian ruble" }, { code: "KZT", name: "Kazakhstani tenge" }, { code: "UZS", name: "Uzbekistani so'm" }, { code: "GEL", name: "Georgian lari" },
  { code: "AZN", name: "Azerbaijani manat" }, { code: "AMD", name: "Armenian dram" }, { code: "ETB", name: "Ethiopian birr" }, { code: "TZS", name: "Tanzanian shilling" },
  { code: "UGX", name: "Ugandan shilling" }, { code: "XOF", name: "West African CFA franc" }, { code: "XAF", name: "Central African CFA franc" }, { code: "XCD", name: "East Caribbean dollar" },
  { code: "JMD", name: "Jamaican dollar" }, { code: "TTD", name: "Trinidad and Tobago dollar" }, { code: "DOP", name: "Dominican peso" }, { code: "CRC", name: "Costa Rican colón" },
  { code: "BOB", name: "Bolivian boliviano" }, { code: "PYG", name: "Paraguayan guaraní" },
];

export type Transaction = {
  id: string;
  name: string;
  detail: string;
  amount: string;
  direction: "incoming" | "outgoing";
  status: string;
  token: string;
};

export const TRANSACTIONS: Transaction[] = [];
