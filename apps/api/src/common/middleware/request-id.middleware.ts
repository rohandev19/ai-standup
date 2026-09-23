import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerName = 'x-request-id';
    const requestId = req.headers[headerName] || uuidv4();
    req.headers[headerName] = requestId;
    // We attach it directly to req for easy access
    (req as any).id = requestId;
    res.setHeader(headerName, requestId);
    next();
  }
}
