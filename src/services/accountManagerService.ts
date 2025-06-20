import { BinanceClient, BinanceAccountType } from '../exchanges/binance.client';
import { BybitClient } from '../exchanges/bybit.client';
import { AccountConfig, config, getAccountByName } from '../config';
import { ExchangeData } from '../models/position.model';

export interface ExchangeClient {
    initialize(): Promise<void>;
    getExchangeData(): Promise<ExchangeData>;
}

// Store exchange clients by account name
const exchangeClients: { [accountName: string]: ExchangeClient } = {};

// Last successful fetch timestamps
const lastFetchTimes: { [accountName: string]: number } = {};

// Error counters
const errorCounts: { [accountName: string]: number } = {};

// Backoff times for each account
const backoffTimes: { [accountName: string]: number } = {};

// Maximum consecutive errors before backing off
const MAX_CONSECUTIVE_ERRORS = 5;
// Initial backoff time in ms (30 seconds)
const INITIAL_BACKOFF = 30000;

export class AccountManager {
    private static instance: AccountManager;

    private constructor() {}

    public static getInstance(): AccountManager {
        if (!AccountManager.instance) {
            AccountManager.instance = new AccountManager();
        }
        return AccountManager.instance;
    }

    // Initialize all accounts from config
    public async initializeAllAccounts(): Promise<void> {
        console.log('Initializing all accounts from configuration...');
        
        for (const accountConfig of config.accounts) {
            try {
                await this.initializeAccount(accountConfig);
                console.log(`Successfully initialized account: ${accountConfig.name}`);
            } catch (error) {
                console.error(`Failed to initialize account ${accountConfig.name}:`, error);
            }
        }
    }

    // Initialize a single account
    public async initializeAccount(accountConfig: AccountConfig): Promise<void> {
        const { name, exchange, accountType, apiKey, apiSecret, baseUrl } = accountConfig;

        let client: ExchangeClient;

        switch (exchange) {
            case 'binance':
                if (accountType === 'futures') {
                    client = new BinanceClient(BinanceAccountType.FUTURES, apiKey, apiSecret, baseUrl);
                } else if (accountType === 'portfolioMargin') {
                    client = new BinanceClient(BinanceAccountType.PORTFOLIO_MARGIN, apiKey, apiSecret, baseUrl);
                } else {
                    throw new Error(`Unsupported Binance account type: ${accountType}`);
                }
                break;
            case 'bybit':
                if (accountType === 'unified') {
                    client = new BybitClient(apiKey, apiSecret, baseUrl);
                } else {
                    throw new Error(`Unsupported Bybit account type: ${accountType}`);
                }
                break;
            default:
                throw new Error(`Unsupported exchange: ${exchange}`);
        }

        // Initialize the client
        await client.initialize();
        
        // Store the client
        exchangeClients[name] = client;
        
        // Initialize tracking variables
        lastFetchTimes[name] = 0;
        errorCounts[name] = 0;
        backoffTimes[name] = 0;

        console.log(`Account ${name} (${exchange} ${accountType}) initialized successfully`);
    }

    // Get all available account names
    public getAvailableAccounts(): string[] {
        return config.accounts.map(account => account.name);
    }

    // Get account configuration by name
    public getAccountConfig(accountName: string): AccountConfig | undefined {
        return getAccountByName(accountName);
    }

    // Get all account configurations
    public getAllAccountConfigs(): { [accountName: string]: AccountConfig } {
        const configs: { [accountName: string]: AccountConfig } = {};
        for (const account of config.accounts) {
            configs[account.name] = account;
        }
        return configs;
    }

    // Fetch data for a specific account
    public async fetchAccountData(accountName: string): Promise<ExchangeData | null> {
        const client = exchangeClients[accountName];
        if (!client) {
            console.error(`No client found for account: ${accountName}`);
            return null;
        }

        // Check if we're in backoff mode
        if (backoffTimes[accountName] > Date.now()) {
            console.log(`Skipping ${accountName} fetch due to backoff. Next attempt in ${Math.round((backoffTimes[accountName] - Date.now()) / 1000)}s`);
            return null;
        }

        try {
            console.log(`Fetching data from account: ${accountName}...`);
            const data = await client.getExchangeData();

            // Update last fetch time
            lastFetchTimes[accountName] = Date.now();

            // Reset error count on success
            errorCounts[accountName] = 0;
            backoffTimes[accountName] = 0;

            return data;
        } catch (error) {
            console.error(`Error fetching data for account ${accountName}: ${error}`);

            // Increment error count
            errorCounts[accountName] = (errorCounts[accountName] || 0) + 1;

            // If we've had too many consecutive errors, back off
            if (errorCounts[accountName] >= MAX_CONSECUTIVE_ERRORS) {
                const backoffTime = INITIAL_BACKOFF * Math.pow(2, Math.min(errorCounts[accountName] - MAX_CONSECUTIVE_ERRORS, 5));
                backoffTimes[accountName] = Date.now() + backoffTime;
                console.log(`Too many consecutive errors for account ${accountName}. Backing off for ${backoffTime / 1000}s`);
            }

            return null;
        }
    }

    // Get health status for all accounts
    public getHealthStatus(): { [accountName: string]: any } {
        const now = Date.now();
        const status: { [accountName: string]: any } = {};

        for (const accountName of Object.keys(exchangeClients)) {
            const lastFetch = lastFetchTimes[accountName] || 0;
            const timeSinceLastFetch = now - lastFetch;
            const isHealthy = lastFetch > 0 && timeSinceLastFetch < 60000; // 1 minute threshold
            const inBackoff = backoffTimes[accountName] > now;

            status[accountName] = {
                healthy: isHealthy,
                lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
                timeSinceLastFetch: lastFetch ? Math.round(timeSinceLastFetch / 1000) : null,
                inBackoff,
                backoffEnds: inBackoff ? new Date(backoffTimes[accountName]).toISOString() : null,
                errorCount: errorCounts[accountName] || 0,
                config: this.getAccountConfig(accountName)
            };
        }

        return status;
    }

    // Check if an account is initialized
    public isAccountInitialized(accountName: string): boolean {
        return !!exchangeClients[accountName];
    }

    // Get all initialized account names
    public getInitializedAccounts(): string[] {
        return Object.keys(exchangeClients);
    }
} 