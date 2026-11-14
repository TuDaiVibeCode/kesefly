import { createServer, type Server } from 'node:http';
import { createApp } from './app';
import { loadConfig, type ServerConfig } from './config';
import { ReservationStore } from './reservations';

export const REQUEST_TIMEOUT_MS = 35_000;
export const HEADERS_TIMEOUT_MS = 10_000;
export function startServer(config: ServerConfig = loadConfig()): { server: Server; store: ReservationStore } {
  const store = new ReservationStore(config.dbPath);
  const server = createServer(createApp(config, { store }));
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 100;
  server.listen(config.port, config.host, () => {
    console.info(JSON.stringify({ event: 'server_started', host: config.host, port: config.port, providerEnabled: config.providerEnabled, emulatorAuth: config.emulatorAuth }));
  });
  server.once('close', () => store.close());
  return { server, store };
}
if (require.main === module) {
  try {
    const { server } = startServer();
    server.once('error', () => { console.error('Server startup failed. Check local configuration and persistent database access.'); process.exitCode = 1; });
    const shutdown = () => {
      server.close();
      setTimeout(() => server.closeAllConnections(), REQUEST_TIMEOUT_MS).unref();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch {
    console.error('Server startup failed. Check local configuration and persistent database access.');
    process.exitCode = 1;
  }
}
