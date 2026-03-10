import { describe, expect, test } from 'vitest';
import {
  getPasswordResetRedirectUrl,
  handlePasswordResetCallback,
  hasAuthCallbackParams,
  parseAuthCallbackParams,
  type PasswordResetAuthClient,
} from './passwordReset';

function createAuthClient(overrides?: Partial<PasswordResetAuthClient>): PasswordResetAuthClient {
  return {
    exchangeCodeForSession: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }),
    ...overrides,
  };
}

describe('parseAuthCallbackParams', () => {
  test('builds password reset redirect URL at /auth', () => {
    expect(getPasswordResetRedirectUrl('http://localhost:3000')).toBe('http://localhost:3000/auth');
  });

  test('parses recovery flow from hash fragment', () => {
    const parsed = parseAuthCallbackParams(
      'http://localhost:3000/auth#access_token=abc123&type=recovery'
    );

    expect(parsed.hasAccessTokenInHash).toBe(true);
    expect(parsed.hashType).toBe('recovery');
    expect(parsed.isRecoveryFlow).toBe(true);
  });

  test('detects callback params when query contains code', () => {
    expect(hasAuthCallbackParams('http://localhost:3000/auth?code=sample-code')).toBe(true);
    expect(hasAuthCallbackParams('http://localhost:3000/auth')).toBe(false);
  });
});

describe('handlePasswordResetCallback', () => {
  test('exchanges code and enables reset form for recovery link', async () => {
    let exchangeCalled = false;
    const auth = createAuthClient({
      exchangeCodeForSession: async () => {
        exchangeCalled = true;
        return { error: null };
      },
    });

    const result = await handlePasswordResetCallback(
      auth,
      'http://localhost:3000/auth?code=recovery-code#type=recovery'
    );

    expect(exchangeCalled).toBe(true);
    expect(result).toEqual({ shouldShowResetForm: true, error: null });
  });

  test('verifies token_hash for recovery query links', async () => {
    let verifiedTokenHash: string | null = null;
    const auth = createAuthClient({
      verifyOtp: async (payload) => {
        verifiedTokenHash = payload.token_hash;
        return { error: null };
      },
    });

    const result = await handlePasswordResetCallback(
      auth,
      'http://localhost:3000/auth?token_hash=hash-token&type=recovery'
    );

    expect(verifiedTokenHash).toBe('hash-token');
    expect(result).toEqual({ shouldShowResetForm: true, error: null });
  });

  test('returns invalid-link error when recovery callback has no session', async () => {
    const auth = createAuthClient({
      getSession: async () => ({ data: { session: null }, error: null }),
    });

    const result = await handlePasswordResetCallback(
      auth,
      'http://localhost:3000/auth#access_token=abc123&type=recovery'
    );

    expect(result.shouldShowResetForm).toBe(false);
    expect(result.error).toContain('invalid or expired');
  });

  test('does not show reset form for non-recovery callback', async () => {
    const auth = createAuthClient();
    const result = await handlePasswordResetCallback(auth, 'http://localhost:3000/auth?code=code123');

    expect(result).toEqual({ shouldShowResetForm: false, error: null });
  });
});
