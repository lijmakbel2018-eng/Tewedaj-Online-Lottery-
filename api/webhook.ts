import app from '../server';

export default async function handler(req: any, res: any) {
  if (!req.url || req.url === '/' || req.url === '/api/webhook') {
    req.url = '/api/telegram/webhook';
  }
  return app(req, res);
}
