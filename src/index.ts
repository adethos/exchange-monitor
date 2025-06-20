import express, { RequestHandler, Request, Response } from 'express';
import cors from 'cors';
import {config} from './config'
import { exchangeRoutes } from './routes/exchange.routes';
import { startDataFetcher, getCachedData } from './services/dataFetcherService';

const app = express();
const PORT = parseInt(process.env.PORT || '', 10) || config.port || 8080;


app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request Body:', req.body);
    }
    next();
});

// Mount exchange routes
app.use('/api', exchangeRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/search', (req, res) => {
    // Return available metrics
    res.json(['price', 'volume', 'trades']);
});

app.post('/query', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { targets } = req.body;
    console.log('query request:', req.body);

    const data = getCachedData();

    const results = targets.map((target: any) => {
        if (target.target === 'positions') {
            const accountName = target.account;
            const positions = data.accounts[accountName]?.positions || [];

            return {
                columns: [
                    { text: 'symbol' },
                    { text: 'side' },
                    { text: 'size' },
                    { text: 'notionalValue' },
                    { text: 'entryPrice' },
                    { text: 'markPrice' },
                    { text: 'liquidationPrice' },
                    { text: 'liquidationPriceChangePercent' },
                    { text: 'currentFundingRate' },
                    { text: 'nextFundingRate' },
                    { text: 'leverage' },
                    { text: 'unrealizedPnl' },
                    { text: 'realizedPnl' },
                    { text: 'marginMode' }
                ],
                rows: positions.map(pos => [
                    pos.symbol,
                    pos.side,
                    pos.size,
                    Math.abs(pos.notionalValue),
                    pos.entryPrice,
                    pos.markPrice,
                    pos.liquidationPrice,
                    Math.abs(pos.liquidationPriceChangePercent),
                    Math.abs(pos.currentFundingRate),
                    Math.abs(pos.nextFundingRate),
                    pos.leverage,
                    pos.unrealizedPnl,
                    pos.realizedPnl,
                    pos.marginMode
                ]),
                type: 'table'
            };
        }
    });

    res.json(results);
    console.log("result:", JSON.stringify(results, null, 2));
});

app.post('/annotations', (req, res) => {
    res.json([]);
});

app.post('/variable', ((req, res) => {
    console.log('Received /variable request:', JSON.stringify(req.body, null, 2));

    const { target } = req.body.payload || {};
    const data = getCachedData();

    if (target === '/api/available') {
        // Return a flat array of account names
        return res.json(data.availableAccounts || []);
    }

    // Handle account-specific queries
    const accountMatch = target && target.match(/^\/api\/account\/([^/]+)$/);
    if (accountMatch) {
        const accountName = accountMatch[1];
        if (!data.accounts[accountName]) {
            return res.status(404).json({ error: 'Account not found' });
        }
        return res.json([accountName]);
    }

    res.status(400).json({ error: 'Unknown variable target' });
}) as RequestHandler);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize data fetchers
startDataFetcher().catch(error => {
    console.error('Failed to start data fetcher:', error);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API endpoints: http://localhost:${PORT}/api`);
});

export default app;