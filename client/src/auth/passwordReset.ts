type OtpPayload = {
  type: 'recovery';
  token_hash: string;
};

type SessionData = {
  session: unknown | null;
};

export interface PasswordResetAuthClient {
  exchangeCodeForSession: (code: string) => Promise<{ error: { message: string } | null }>;
  verifyOtp: (payload: OtpPayload) => Promise<{ error: { message: string } | null }>;
  getSession: () => Promise<{ data: SessionData; error: { message: string } | null }>;
}

export interface AuthCallbackParams {
  code: string | null;
  tokenHash: string | null;
  queryType: string | null;
  hashType: string | null;
  hasAccessTokenInHash: boolean;
  isRecoveryFlow: boolean;
}

export interface PasswordResetCallbackResult {
  shouldShowResetForm: boolean;
  error: string | null;
}

const INVALID_LINK_ERROR =
  'This password reset link is invalid or expired. Request a new reset email and try again.';

export function getPasswordResetRedirectUrl(origin = window.location.origin): string {
  return new URL('/auth', origin).toString();
}

export function parseAuthCallbackParams(href: string): AuthCallbackParams {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const queryType = url.searchParams.get('type');
  const hashType = hash.get('type');
  const hasAccessTokenInHash = Boolean(hash.get('access_token'));
  const isRecoveryFlow = queryType === 'recovery' || hashType === 'recovery';

  return {
    code,
    tokenHash,
    queryType,
    hashType,
    hasAccessTokenInHash,
    isRecoveryFlow,
  };
}

export function hasAuthCallbackParams(href: string): boolean {
  const parsed = parseAuthCallbackParams(href);
  return Boolean(
    parsed.code ||
      parsed.tokenHash ||
      parsed.queryType ||
      parsed.hashType ||
      parsed.hasAccessTokenInHash
  );
}

export async function handlePasswordResetCallback(
  auth: PasswordResetAuthClient,
  href: string
): Promise<PasswordResetCallbackResult> {
  const parsed = parseAuthCallbackParams(href);

  if (parsed.code) {
    const { error } = await auth.exchangeCodeForSession(parsed.code);
    if (error) {
      return { shouldShowResetForm: false, error: INVALID_LINK_ERROR };
    }
  }

  if (parsed.tokenHash && parsed.queryType === 'recovery') {
    const { error } = await auth.verifyOtp({
      type: 'recovery',
      token_hash: parsed.tokenHash,
    });
    if (error) {
      return { shouldShowResetForm: false, error: INVALID_LINK_ERROR };
    }
  }

  const { data, error } = await auth.getSession();
  if (error) {
    return { shouldShowResetForm: false, error: error.message };
  }

  if (parsed.isRecoveryFlow && !data.session) {
    return { shouldShowResetForm: false, error: INVALID_LINK_ERROR };
  }

  return { shouldShowResetForm: parsed.isRecoveryFlow, error: null };
}
