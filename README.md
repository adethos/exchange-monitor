# Cryptocurrency Trading Dashboard Middleware

A middleware service that fetches trading data from multiple cryptocurrency exchanges and provides it to Grafana dashboards.

## Features

- **Dynamic Account Management**: Add new exchange accounts by simply updating the configuration file
- **Labeled Accounts**: Each account can have a custom label (e.g., "SF1", "PM1", "BY1") that appears in Grafana
- **Automatic Account Type Detection**: The system automatically detects and uses the appropriate API methods based on account type
- **Multiple Exchange Support**: Currently supports Binance (Futures, Portfolio Margin) and Bybit (Unified)
- **Real-time Data**: Fetches position data, account summaries, and metrics every 40 seconds
- **Grafana Integration**: Provides JSON API endpoints compatible with Grafana data sources

## Configuration

### Adding New Accounts

To add a new account, simply add it to the `accounts` array in `src/config.ts`:

```typescript
{
    name: 'SF1', // This will be the label shown in Grafana
    exchange: 'binance' as const,
    accountType: 'futures' as const,
    apiKey: process.env.BINANCE_FUTURES_API_KEY || 'your-api-key',
    apiSecret: process.env.BINANCE_FUTURES_API_SECRET || 'your-api-secret',
    baseUrl: process.env.BINANCE_FUTURES_BASE_URL || 'https://api.binance.com'
}
```

### Supported Account Types

- **Binance**:
  - `futures`: USDT-M and COIN-M Futures
  - `portfolioMargin`: Portfolio Margin Account
- **Bybit**:
  - `unified`: Unified Trading Account

### Environment Variables

You can use environment variables for API credentials:

```bash
# Binance Futures
BINANCE_FUTURES_API_KEY=your-api-key
BINANCE_FUTURES_API_SECRET=your-api-secret

# Binance Portfolio Margin
BINANCE_PM_API_KEY=your-api-key
BINANCE_PM_API_SECRET=your-api-secret

# Bybit
BYBIT_API_KEY=your-api-key
BYBIT_API_SECRET=your-api-secret
```

## API Endpoints

### Grafana Data Source Endpoints

- `GET /search` - Returns available metrics
- `POST /query` - Returns position data for Grafana tables
- `POST /variable` - Returns account names for Grafana variables
- `POST /annotations` - Returns annotations (empty)

### REST API Endpoints

- `GET /api/available` - Get all available accounts
- `GET /api/accounts` - Get all account configurations
- `GET /api/accounts/:accountName` - Get specific account configuration
- `GET /api/positions/:accountName` - Get positions for specific account
- `GET /api/account-summary/:accountName` - Get account summary for specific account
- `GET /api/health` - Get health status of all accounts
- `POST /api/accounts` - Add new account dynamically

## Grafana Setup

### Data Source Configuration

1. Add a new JSON data source in Grafana
2. Set the URL to your middleware service (e.g., `http://localhost:8080`)
3. Configure the following settings:
   - **Query Method**: POST
   - **Query Path**: `/query`

### Variables

Create a variable for account selection:
- **Name**: `account`
- **Type**: Query
- **Data Source**: Your JSON data source
- **Query**: `/api/available`

### Dashboard Queries

For position data:
```json
{
  "targets": [
    {
      "target": "positions",
      "account": "$account"
    }
  ]
}
```

## Running the Service

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm install
npm run build
npm start
```

The service will start on port 8080 by default. You can change this by setting the `PORT` environment variable.

## Health Monitoring

The service provides health monitoring for all accounts:

- **Healthy**: Account data was fetched successfully within the last minute
- **Backoff**: Account is temporarily disabled due to consecutive errors
- **Error Count**: Number of consecutive errors for each account

## Adding New Exchanges

To add support for a new exchange:

1. Create a new client class implementing the `ExchangeClient` interface
2. Add the exchange type to the `AccountConfig` interface
3. Update the `AccountManager.initializeAccount()` method to handle the new exchange
4. Add the exchange to the configuration

## Security Notes

- API keys and secrets should be stored in environment variables
- The service runs on all interfaces (0.0.0.0) by default
- CORS is enabled for all origins in development
- Consider implementing proper authentication for production use 