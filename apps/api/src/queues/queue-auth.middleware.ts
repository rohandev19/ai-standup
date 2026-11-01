import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Basic Authentication middleware for administrative BullMQ Dashboard (/admin/queues).
 * Prevents unauthorized public access to sensitive queue jobs and reset tokens.
 */
export function queueAdminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPassword =
    process.env.ADMIN_PASSWORD || (isProduction ? undefined : 'admin');

  // If in production and password is not explicitly configured, fail closed
  if (!adminPassword) {
    res
      .status(503)
      .send('Admin queue dashboard credentials are not configured');
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    res.status(401).send('Authentication required');
    return;
  }

  const base64Credentials = authHeader.substring(6).trim();
  let credentials = '';
  try {
    credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  } catch {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    res.status(401).send('Invalid credentials encoding');
    return;
  }

  const separatorIndex = credentials.indexOf(':');
  if (separatorIndex === -1) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    res.status(401).send('Invalid authorization format');
    return;
  }

  const username = credentials.substring(0, separatorIndex);
  const password = credentials.substring(separatorIndex + 1);

  const userBuf = Buffer.from(username);
  const expectedUserBuf = Buffer.from(adminUser);
  const passBuf = Buffer.from(password);
  const expectedPassBuf = Buffer.from(adminPassword);

  const isUserValid =
    userBuf.length === expectedUserBuf.length &&
    crypto.timingSafeEqual(userBuf, expectedUserBuf);
  const isPassValid =
    passBuf.length === expectedPassBuf.length &&
    crypto.timingSafeEqual(passBuf, expectedPassBuf);

  if (!isUserValid || !isPassValid) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullMQ Dashboard"');
    res.status(401).send('Invalid username or password');
    return;
  }

  next();
}
