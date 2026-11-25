import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('Google OAuth callback', () => {
  const getGoogleAuthUrl = jest.fn();
  const handleGoogleCallback = jest.fn();
  const controller = new AuthController({
    getGoogleAuthUrl,
    handleGoogleCallback,
  } as unknown as AuthService);
  const res = {
    setHeader: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  };
  const front = process.env.FRONTEND_URL;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.FRONTEND_URL = 'https://app.example.invalid';
  });

  afterAll(() => {
    if (front === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = front;
  });

  it('sends the generated state to Google and stores it in an HttpOnly callback cookie', () => {
    getGoogleAuthUrl.mockReturnValue('https://accounts.google.com/');
    controller.googleAuth(res as unknown as Response);

    const state = getGoogleAuthUrl.mock.calls[0][0] as string;
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    expect(res.cookie).toHaveBeenCalledWith(
      'googleOAuthState',
      state,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth/google/callback',
      }),
    );
  });

  it.each([undefined, 'b'.repeat(64)])(
    'rejects a missing or mismatched callback state',
    async (state) => {
      await controller.googleAuthCallback(
        'oauth-code',
        state,
        { cookies: { googleOAuthState: 'a'.repeat(64) } } as unknown as Request,
        res as unknown as Response,
      );

      expect(handleGoogleCallback).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error='),
      );
    },
  );

  it('clears matching state and redirects without a session token in the URL', async () => {
    handleGoogleCallback.mockResolvedValue({
      refreshToken: 'test-refresh-token',
    });
    await controller.googleAuthCallback(
      'oauth-code',
      'a'.repeat(64),
      { cookies: { googleOAuthState: 'a'.repeat(64) } } as unknown as Request,
      res as unknown as Response,
    );

    expect(handleGoogleCallback).toHaveBeenCalledWith('oauth-code');
    expect(res.clearCookie).toHaveBeenCalledWith(
      'googleOAuthState',
      expect.objectContaining({ path: '/api/auth/google/callback' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'test-refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      'https://app.example.invalid/oauth/callback',
    );
  });
});
