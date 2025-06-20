import express, { Request, Response, RequestHandler } from 'express';
import path from 'path';
import { getCachedData, setCurrentAccount, getHealthStatus, getAccountManager } from '../services/dataFetcherService';
import { AccountConfig, getAccountsByExchange } from '../config';

const router = express.Router();

// Error handler wrapper
const asyncHandler = (fn: RequestHandler): RequestHandler => 
    (req: Request, res: Response, next: express.NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(error => {
            console.error(`Error in ${req.path}: ${error}`);
            res.status(500).json({ error: `Failed to process request: ${error.message}` });
        });
    };

// Root endpoint for API
router.get('/', ((req: Request, res: Response) => {
    res.json({
        status: 'ok',
        endpoints: {
            search: '/search',
            query: '/query',
            annotations: '/annotations',
            health: '/health',
            accounts: '/accounts',
            positions: '/positions/:accountName',
            accountSummary: '/account-summary/:accountName'
        }
    });
}) as RequestHandler);

// Serve static files
router.use('/test', express.static(path.join(__dirname, '../public')));

// Grafana JSON API endpoints
router.get('/search', ((req: Request, res: Response) => {
    const metrics = [
        'positions',
        'account_summary',
        'available_accounts',
        'health_status'
    ];
    res.json(metrics);
}) as RequestHandler);

// Get all data
router.get('/data', ((req: Request, res: Response) => {
    const data = getCachedData();
    res.json(data);
}) as RequestHandler);

// Get positions for a specific account
router.get('/positions/:accountName', ((req: Request, res: Response) => {
    const { accountName } = req.params;
    const data = getCachedData();

    if (!data.accounts[accountName]) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json(data.accounts[accountName].positions);
}) as RequestHandler);

// Get account summary for a specific account
router.get('/account-summary/:accountName', ((req: Request, res: Response) => {
    const { accountName } = req.params;
    const data = getCachedData();

    if (!data.accounts[accountName]) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json(data.accounts[accountName].accountSummary);
}) as RequestHandler);

// Get available exchanges
router.get('/available', ((req: Request, res: Response) => {
    const accountManager = getAccountManager();
    const accounts = accountManager.getAllAccountConfigs();
    
    // Extract unique exchanges from account configurations
    const exchanges = [...new Set(Object.values(accounts).map(account => account.exchange))];
    
    res.json({
        exchanges: exchanges
    });
}) as RequestHandler);

// Set current account
router.post('/set-current', ((req: Request, res: Response) => {
    const { accountName } = req.body;

    if (!accountName) {
        return res.status(400).json({ error: 'Account name is required' });
    }

    try {
        setCurrentAccount(accountName);
        res.json({ success: true, accountName });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
}) as RequestHandler);

// Get health status
router.get('/health', ((req: Request, res: Response) => {
    const status = getHealthStatus();
    res.json(status);
}) as RequestHandler);

// Get accounts for a specific exchange
router.get('/accounts/:exchange', ((req: Request, res: Response) => {
    const { exchange } = req.params;
    const accounts = getAccountsByExchange(exchange);
    
    if (accounts.length === 0) {
        return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Return account names for the specified exchange in JSON object format
    const accountNames = accounts.map(account => account.name);
    res.json({
        accounts: accountNames
    });
}) as RequestHandler);

// Get all accounts with their configurations
router.get('/accounts', ((req: Request, res: Response) => {
    const accountManager = getAccountManager();
    const accounts = accountManager.getAllAccountConfigs();
    res.json(accounts);
}) as RequestHandler);

// Get account configuration by name
router.get('/accounts/:accountName', ((req: Request, res: Response) => {
    const { accountName } = req.params;
    const accountManager = getAccountManager();
    const config = accountManager.getAccountConfig(accountName);

    if (!config) {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.json(config);
}) as RequestHandler);

// Add new account (for dynamic account addition)
router.post('/accounts', ((req: Request, res: Response) => {
    const { name, exchange, accountType, apiKey, apiSecret, baseUrl } = req.body;

    if (!name || !exchange || !accountType || !apiKey || !apiSecret) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const accountManager = getAccountManager();
    
    // Check if account already exists
    if (accountManager.getAccountConfig(name)) {
        return res.status(400).json({ error: 'Account with this name already exists' });
    }

    const accountConfig: AccountConfig = {
        name,
        exchange,
        accountType,
        apiKey,
        apiSecret,
        baseUrl
    };

    // Initialize the new account
    accountManager.initializeAccount(accountConfig)
        .then(() => {
            res.json({ success: true, message: 'Account added successfully', accountName: name });
        })
        .catch(error => {
            res.status(500).json({ error: `Failed to initialize account: ${error.message}` });
        });
}) as RequestHandler);

// Get account metrics for a specific account
router.post('/account-metrics', ((req, res) => {
    res.set('Cache-Control', 'no-store');
    const { targets } = req.body;
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const target = targets[0];
    const { account } = target;
    
    if (!account) {
        return res.status(400).json({ error: 'Account name is required' });
    }
    
    const data = getCachedData();
    const accountData = data.accounts[account];
    
    if (!accountData) {
        return res.status(404).json({ error: 'Account not found' });
    }

    // Compose metrics object
    const metrics = {
        baseCurrency: accountData.accountSummary.baseCurrency,
        baseBalance: accountData.accountSummary.baseBalance,
        totalNotionalValue: accountData.accountSummary.totalNotionalValue,
        accountLeverage: accountData.accountSummary.accountLeverage,
        openPositions: accountData.accountSummary.openPositionsCount,
        openOrders: accountData.accountSummary.openOrdersCount,
        marginRatio: accountData.accountSummary.accountMarginRatio,
        liquidationBuffer: accountData.accountSummary.liquidationBuffer,
    };
    
    res.json(metrics);
}) as RequestHandler);

export const exchangeRoutes = router;