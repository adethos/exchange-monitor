export interface Position {
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    notionalValue: number;
    entryPrice: number;
    markPrice: number;
    liquidationPrice: number;
    liquidationPriceChangePercent: number;
    currentFundingRate: number;
    nextFundingRate: number;
    leverage: number;
    unrealizedPnl: number;
    realizedPnl: number;
    marginMode: 'CROSS' | 'ISOLATED';
    exchange: string;
    accountName: string;
}

export interface AccountSummary {
    exchange: string;
    accountName: string;
    accountType: string;
    baseCurrency: string;
    baseBalance: number;
    totalNotionalValue: number;
    accountLeverage: number;
    openPositionsCount: number;
    openOrdersCount: number;
    liquidationBuffer: number;
    accountMarginRatio: number;
}

export interface ExchangeData {
    positions: Position[];
    accountSummary: AccountSummary;
}

export interface CombinedData {
    accounts: {
        [accountName: string]: ExchangeData;
    };
    currentAccount: string;
    availableAccounts: string[];
    accountConfigs: { [accountName: string]: any };
}