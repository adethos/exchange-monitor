import express, { RequestHandler } from 'express';
import cors from 'cors';
import {config} from './config'
import { exchangeRoutes } from './routes/exchange.routes';
import { startDataFetcher, getCachedData } from './services/dataFetcherService';

const app = express();
// Use PORT from environment variable (Render.com) or fallback to config port (local)
const PORT = parseInt(process.env.PORT || '', 10) || config.port || 8080;


// Middleware
app.use(cors({
    origin: '*', // Allow all origins
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

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/search', (req, res) => {
    // Return available metrics
    res.json(['price', 'volume', 'trades']);
});

app.post('/annotations', (req, res) => {
    res.json([]);
});

app.post('/variable', ((req, res) => {

    console.log('Received /variable request:', JSON.stringify(req.body, null, 2));

    const { target } = req.body.payload || {};
    const data = getCachedData();

    if (target === '/api/available') {
        // Return a flat array of exchange names
        return res.json(data.availableExchanges || []);
    }

    // Correct: Use RegExp to match /api/accounts/{exchange}
    const accountsMatch = target && target.match(/^\/api\/accounts\/([^/]+)$/);
    if (accountsMatch) {
        const exchange = accountsMatch[1];
        if (!data.availableAccounts[exchange]) {
            return res.status(404).json({ error: 'Exchange not found' });
        }
        return res.json(data.availableAccounts[exchange]);
    }

    // You can add more cases for other variable queries here
    res.status(400).json({ error: 'Unknown variable target' });
}) as RequestHandler);

// Mount API routes
app.use('/api', exchangeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize data fetchers and WebSocket connections
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