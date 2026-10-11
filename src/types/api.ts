export type AmountValue = number | string;

export type Wallet = {
  address: string;
  balanceToken: AmountValue;
  balanceUsd: AmountValue;
  balanceLocal: AmountValue;
  currency: string;
  asset?: string;
  chainId?: number;
};

export type Me = { accountId: string; alias: string | null; currency: string };

export type Rates = {
  tokenUsd: number;
  usdLocal: number;
  currency?: string;
  updatedAt: string;
};

export type HomeData = Me & Wallet & { rates: Rates };

export type Payment = {
  id: string;
  direction: "in" | "out";
  counterparty: string;
  usdValue: AmountValue;
  localValue: AmountValue;
  displayCurrency?: string;
  status: string;
  txHash?: string | null;
  createdAt: string;
};

export type SendResult = {
  txId: string;
  status: string;
  tokenAmount: AmountValue;
  usdValue: AmountValue;
  txHash?: string;
};

export type WithdrawResult = {
  withdrawalId: string;
  status: string;
  payoutLocal: AmountValue;
  usdValue: AmountValue;
  currency: string;
};
