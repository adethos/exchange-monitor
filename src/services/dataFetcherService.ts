import { AccountManager } from './accountManagerService';
import { CombinedData, ExchangeData } from '../models/position.model';

// In-memory cache
let cachedData: CombinedData = {
    accounts: {},
    currentAccount: '',
    availableAccounts: [],
    accountConfigs: {}
};

// Data fetch interval in ms (40 seconds)
const FETCH_INTERVAL = 40000;

// Get the account manager instance
const accountManager = AccountManager.getInstance();

function logAccountMetrics(data: CombinedData) {
    console.log('\n========== ACCOUNT METRICS ==========');

    // Log metrics for each account
    for (const accountName of Object.keys(data.accounts)) {
        const accountData = data.accounts[accountName];
        if (!accountData) continue;

        const config = accountManager.getAccountConfig(accountName);
        console.log(`\n--- ${accountName} (${config?.exchange} ${config?.accountType}) ---`);

        // Log Account Summary
        const summary = accountData.accountSummary;
        console.log('\nAccount Summary:');
        console.log(`• Base Currency: ${summary.baseCurrency}`);
        console.log(`• Base Balance: ${Number(summary.baseBalance).toFixed(2)} ${summary.baseCurrency}`);
        console.log(`• Total Notional Value: ${Number(summary.totalNotionalValue).toFixed(2)} ${summary.baseCurrency}`);
        console.log(`• Account Leverage: ${Number(summary.accountLeverage).toFixed(2)}x`);
        console.log(`• Open Positions: ${summary.openPositionsCount}`);
        console.log(`• Open Orders: ${summary.openOrdersCount}`);
        console.log(`• Margin Ratio: ${Number(summary.accountMarginRatio).toFixed(2)}%`);
        console.log(`• Liquidation Buffer: ${Number(summary.liquidationBuffer).toFixed(2)}%`);

        // Log Positions
        if (accountData.positions.length > 0) {
            console.log('\nOpen Positions:');
            accountData.positions.forEach((pos, index) => {
                console.log(`\nPosition ${index + 1}:`);
                console.log(`• Symbol: ${pos.symbol}`);
                console.log(`• Side: ${pos.side}`);
                console.log(`• Size: ${Number(pos.size).toFixed(2)}`);
                console.log(`• Notional Value: ${Number(pos.notionalValue).toFixed(2)} ${summary.baseCurrency}`);
                console.log(`• Entry Price: ${Number(pos.entryPrice).toFixed(2)}`);
                console.log(`• Mark Price: ${Number(pos.markPrice).toFixed(2)}`);
                console.log(`• Liquidation Price: ${Number(pos.liquidationPrice).toFixed(2)}`);
                console.log(`• Liquidation change Percent: ${Number(pos.liquidationPriceChangePercent).toFixed(2)}%`);
                console.log(`• Current Funding Rate: ${Number(pos.currentFundingRate).toFixed(2)}%`);
                console.log(`• Next Funding Rate: ${Number(pos.nextFundingRate).toFixed(2)}%`);
                console.log(`• Leverage: ${Number(pos.leverage).toFixed(2)}x`);
                console.log(`• Unrealized PnL: ${Number(pos.unrealizedPnl).toFixed(2)} ${summary.baseCurrency}`);
                console.log(`• Realized PnL: ${Number(pos.realizedPnl).toFixed(2)} ${summary.baseCurrency}`);
                console.log(`• Margin Mode: ${pos.marginMode}`);
            });
        } else {
            console.log('\nNo open positions');
        }
    }
    console.log('\n=====================================');
}

// Fetch data for all accounts
async function fetchAllAccountsData(): Promise<void> {
    const availableAccounts = accountManager.getAvailableAccounts();
    
    for (const accountName of availableAccounts) {
        try {
            const data = await accountManager.fetchAccountData(accountName);
            if (data) {
                // Update cache
                cachedData.accounts[accountName] = data;
                
                // Update account configs
                const config = accountManager.getAccountConfig(accountName);
                if (config) {
                    cachedData.accountConfigs[accountName] = config;
                }
            }
        } catch (error) {
            console.error(`Error fetching data for account ${accountName}:`, error);
        }
    }
}

// Start the data fetching service
export async function startDataFetcher(): Promise<void> {
    try {
        // Initialize all accounts from config
        await accountManager.initializeAllAccounts();

        // Update cached data structure
        cachedData.availableAccounts = accountManager.getAvailableAccounts();
        cachedData.accountConfigs = accountManager.getAllAccountConfigs();
        
        if (cachedData.availableAccounts.length > 0) {
            cachedData.currentAccount = cachedData.availableAccounts[0];
        }

        // Initial data fetch
        await fetchAllAccountsData();

        // Log initial metrics
        logAccountMetrics(cachedData);

        // Set up periodic data fetching
        setInterval(async () => {
            await fetchAllAccountsData();
            logAccountMetrics(cachedData);
            console.log(`[${new Date().toISOString()}] Completed scheduled data fetch`);
        }, FETCH_INTERVAL);

        console.log(`Data fetcher started with ${FETCH_INTERVAL/1000}s interval`);
        console.log(`Monitoring ${cachedData.availableAccounts.length} accounts: ${cachedData.availableAccounts.join(', ')}`);
    } catch (error) {
        console.error('Failed to start data fetcher:', error);
        throw error;
    }
}

// Get the current cached data
export function getCachedData(): CombinedData {
    // Create a deep copy of the data to ensure Grafana gets fresh data
    const data = JSON.parse(JSON.stringify(cachedData));
    
    // Add timestamp to help with debugging
    data.lastUpdate = new Date().toISOString();
    
    return data;
}

// Set current account
export function setCurrentAccount(accountName: string): void {
    if (cachedData.availableAccounts.includes(accountName)) {
        cachedData.currentAccount = accountName;
    } else {
        throw new Error(`Invalid account: ${accountName}`);
    }
}

// Get health status
export function getHealthStatus(): { [key: string]: any } {
    return accountManager.getHealthStatus();
}

// Get account manager instance (for external use)
export function getAccountManager(): AccountManager {
    return accountManager;
}