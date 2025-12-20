import { NextFunction, Request, Response } from 'express';
import { User } from './types';

const API_KEY = process.env.API_KEY || 'dev-api-key';

const extractApiKey = (req: Request, allowQuery = false): string | undefined => {
  const headerKey = req.header('x-api-key') || req.header('authorization');
  if (headerKey?.startsWith('Bearer ')) {
    return headerKey.slice('Bearer '.length);
  }
  if (headerKey && !headerKey.startsWith('Bearer ')) {
    return headerKey;
  }
  if (allowQuery) {
    const q = req.query.apiKey;
    if (typeof q === 'string') return q;
  }
  return undefined;
};

export const getUserFromRequest = (
  req: Request,
  allowQueryKey = false
): User | undefined => {
  const key = extractApiKey(req, allowQueryKey);
  if (!key || key !== API_KEY) return undefined;

  return {
    id: 'api-key-user',
    name: 'API Key User',
  };
};

export const requireAuth =
  (allowQueryKey = false) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = getUserFromRequest(req, allowQueryKey);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: invalid API key' });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = user;
    next();
  };

