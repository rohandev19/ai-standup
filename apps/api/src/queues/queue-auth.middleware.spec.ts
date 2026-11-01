import { queueAdminAuthMiddleware } from './queue-auth.middleware';
import { Request, Response, NextFunction } from 'express';

describe('queueAdminAuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'supersecretpassword';
    process.env.NODE_ENV = 'production';

    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 401 and set WWW-Authenticate header if authorization header is missing', () => {
    queueAdminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="BullMQ Dashboard"',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith('Authentication required');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if credentials are invalid', () => {
    const invalidAuth = Buffer.from('admin:wrongpassword').toString('base64');
    mockRequest.headers = { authorization: `Basic ${invalidAuth}` };

    queueAdminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Invalid username or password',
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() when valid credentials are provided', () => {
    const validAuth = Buffer.from('admin:supersecretpassword').toString(
      'base64',
    );
    mockRequest.headers = { authorization: `Basic ${validAuth}` };

    queueAdminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should fail closed with 503 in production if ADMIN_PASSWORD is unset', () => {
    delete process.env.ADMIN_PASSWORD;

    queueAdminAuthMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Admin queue dashboard credentials are not configured',
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
