import express, { Request, Response, RequestHandler } from 'express';
import path from 'path';
import { getCachedData, setCurrentExchangeAndAccount, getHealthStatus } from '../services/dataFetcherService';
import { BinanceClient } from '../exchanges/binance.client';
import { BybitClient } from '../exchanges/bybit.client';
import { BinanceAccountType } from '../exchanges/binance.client';

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
            health: '/health'
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
        'available_exchanges',
        'health_status'
    ];
    res.json(metrics);
}) as RequestHandler);

// Get all data
router.get('/data', ((req: Request, res: Response) => {
    const data = getCachedData();
    res.json(data);
}) as RequestHandler);

// Get positions for current exchange and account
router.get('/positions', ((req: Request, res: Response) => {
    const data = getCachedData();
    const { currentExchange, currentAccount } = data;

    if (!currentExchange || !currentAccount) {
        return res.status(404).json({ error: 'No exchange or account selected' });
    }

    const exchangeData = data.exchanges[currentExchange]?.[currentAccount];
    if (!exchangeData) {
        return res.status(404).json({ error: 'No data available for selected exchange and account' });
    }

    res.json(exchangeData.positions);
}) as RequestHandler);

// Get account summary for current exchange and account
router.get('/account-summary', ((req: Request, res: Response) => {
    const data = getCachedData();
    const { currentExchange, currentAccount } = data;

    if (!currentExchange || !currentAccount) {
        return res.status(404).json({ error: 'No exchange or account selected' });
    }

    const exchangeData = data.exchanges[currentExchange]?.[currentAccount];
    if (!exchangeData) {
        return res.status(404).json({ error: 'No data available for selected exchange and account' });
    }

    res.json(exchangeData.accountSummary);
}) as RequestHandler);

// Get available exchanges and accounts
router.get('/available', ((req: Request, res: Response) => {
    const data = getCachedData();
    res.json({
        exchanges: data.availableExchanges,
        accounts: data.availableAccounts,
        currentExchange: data.currentExchange,
        currentAccount: data.currentAccount,
    });
}) as RequestHandler);

// Set current exchange and account
router.post('/set-current', ((req: Request, res: Response) => {
    const { exchange, account } = req.body;

    if (!exchange || !account) {
        return res.status(400).json({ error: 'Exchange and account are required' });
    }

    setCurrentExchangeAndAccount(exchange, account);
    res.json({ success: true, exchange, account });
}) as RequestHandler);

// Get health status
router.get('/health', ((req: Request, res: Response) => {
    const status = getHealthStatus();
    res.json(status);
}) as RequestHandler);

// Add API key for an exchange
router.post('/add-api-key', ((req: Request, res: Response) => {
    const { exchange, apiKey, apiSecret, accountName } = req.body;

    if (!exchange || !apiKey || !apiSecret || !accountName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (exchange === 'binance') {
        const accountType = accountName === 'portfolioMargin' ?
            BinanceAccountType.PORTFOLIO_MARGIN : BinanceAccountType.FUTURES;
        const binanceClient = new BinanceClient(accountType);
        binanceClient.initialize()
            .then(() => {
                res.json({ success: true, message: 'API key added successfully' });
            })
            .catch(error => {
                res.status(500).json({ error: `Failed to initialize Binance client: ${error.message}` });
            });
    } else if (exchange === 'bybit') {
        const bybitClient = new BybitClient();
        bybitClient.initialize()
            .then(() => {
                res.json({ success: true, message: 'API key added successfully' });
            })
            .catch(error => {
                res.status(500).json({ error: `Failed to initialize Bybit client: ${error.message}` });
            });
    } else {
        res.status(400).json({ error: 'Unsupported exchange' });
    }
}) as RequestHandler);

// Get available accounts for an exchange
router.get('/accounts/:exchange', ((req: Request, res: Response) => {
    const { exchange } = req.params;
    const data = getCachedData();

    if (!data.availableAccounts[exchange]) {
        return res.status(404).json({ error: 'Exchange not found' });
    }

    res.json({
        accounts: data.availableAccounts[exchange],
        currentAccount: data.currentAccount
    });
}) as RequestHandler);

// Get account metrics for current exchange and account
router.post('/account-metrics', ((req, res) => {
    res.set('Cache-Control', 'no-store');
    const { targets } = req.body;
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ error: 'Invalid request body' });
    }
    const target = targets[0];
    const { exchange, account } = target;
    if (!exchange || !account) {
        return res.status(400).json({ error: 'Exchange and account are required' });
    }
    setCurrentExchangeAndAccount(exchange, account);
    const data = getCachedData();
    const { currentExchange, currentAccount } = data;
    const accountData = data.exchanges[currentExchange]?.[currentAccount];
    if (!accountData) return res.status(404).json({ error: 'No data' });

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