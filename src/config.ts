export interface AccountConfig {
    name: string;
    exchange: 'binance' | 'bybit';
    accountType: 'futures' | 'portfolioMargin' | 'unified';
    apiKey: string;
    apiSecret: string;
    baseUrl?: string;
}

export const config = {
    port: parseInt(process.env.PORT || '8080', 10),
    accounts: [
        // Add the accounts
        {
            name: 'SF1',
            exchange: 'binance' as const,
            accountType: 'futures' as const,
            apiKey: process.env.BINANCE_FUTURES_SF1_API_KEY || 'wQBWQeaYKxDt181bGFPFZAH7U2UXKigVVvBlmKGfsrq5k89BjCG0H6zKIjQ2dRPJ',
            apiSecret: process.env.BINANCE_FUTURES_SF1_API_SECRET || 'I3dDrmLtiRq7YK7bzobRa3QoTOd8Wmh0zGmu9pIyQOKRVR7Mgjgjk3e8GGcqgQbS',
            baseUrl: process.env.BINANCE_FUTURES_BASE_URL || 'https://fapi.binance.com'
        },
        {
            name: 'SF2',
            exchange: 'binance' as const,
            accountType: 'futures' as const,
            apiKey: process.env.BINANCE_FUTURES_SF2_API_KEY || 'EnZqvinmoElGRSKFPe6DoojWDTkruaFfofSOA6CMbkXNb6bMkr23VtGNvG6RDaNE',
            apiSecret: process.env.BINANCE_FUTURES_SF2_API_SECRET || 'huViu7jsA3H5y1d9OGPYj8XIDbysT8NFi18XfHJleqy8zrz2ecy22Ib73JtBnXvt',
            baseUrl: process.env.BINANCE_FUTURES_BASE_URL || 'https://fapi.binance.com'
        },
        {
            name: 'PM1',
            exchange: 'binance' as const,
            accountType: 'portfolioMargin' as const,
            apiKey: process.env.BINANCE_PM1_API_KEY || 'aQIIhOsPnW0SQaVklY7J7jxNDxYkXWjfXiEUbUFA0ORSHkLm3mbJTEEPlftVKsVk',
            apiSecret: process.env.BINANCE_PM1_API_SECRET || 'y4WAEBBA3VMYOa3qeAkNUqOMqUr8MyEnhSfT2ZNhUXaGwkj1TSERlTfuHG96aY4J',
            baseUrl: process.env.BINANCE_PM_BASE_URL || 'https://papi.binance.com'
        },
        {
            name: 'PM2',
            exchange: 'binance' as const,
            accountType: 'portfolioMargin' as const,
            apiKey: process.env.BINANCE_PM2_API_KEY || 'aQIIhOsPnW0SQaVklY7J7jxNDxYkXWjfXiEUbUFA0ORSHkLm3mbJTEEPlftVKsVk',
            apiSecret: process.env.BINANCE_PM2_API_SECRET || 'y4WAEBBA3VMYOa3qeAkNUqOMqUr8MyEnhSfT2ZNhUXaGwkj1TSERlTfuHG96aY4J',
            baseUrl: process.env.BINANCE_PM_BASE_URL || 'https://papi.binance.com'
        },
        // {
        //     name: 'BY1',
        //     exchange: 'bybit' as const,
        //     accountType: 'unified' as const,
        //     apiKey: process.env.BYBIT_BY1_API_KEY || 'gkdkqHsxgQ6t1gj5PV',
        //     apiSecret: process.env.BYBIT_BY1_API_SECRET || 'jidIU3oOLYZltaga06F6wD20t07h9jwOxjrV',
        //     baseUrl: process.env.BYBIT_BASE_URL || 'https://api.bybit.com'
        // },
        // {
        //     name: 'BY2',
        //     exchange: 'bybit' as const,
        //     accountType: 'unified' as const,
        //     apiKey: process.env.BYBIT_BY2_API_KEY || 'gkdkqHsxgQ6t1gj5PV',
        //     apiSecret: process.env.BYBIT_BY2_API_SECRET || 'jidIU3oOLYZltaga06F6wD20t07h9jwOxjrV',
        //     baseUrl: process.env.BYBIT_BASE_URL || 'https://api.bybit.com'
        // }
    ] as AccountConfig[]
};

// Helper function to get accounts by exchange
export function getAccountsByExchange(exchange: string): AccountConfig[] {
    return config.accounts.filter(account => account.exchange === exchange);
}

// Helper function to get account by name
export function getAccountByName(name: string): AccountConfig | undefined {
    return config.accounts.find(account => account.name === name);
}

// Helper function to get all account names
export function getAllAccountNames(): string[] {
    return config.accounts.map(account => account.name);
}
