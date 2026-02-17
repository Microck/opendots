export type TurnstileVerifyResult = {
  required: boolean;
  success: boolean;
  errorCodes?: string[];
};

export async function verifyTurnstileToken(params: {
  token: string | null | undefined;
  remoteIp?: string;
}): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { required: false, success: true };
  }

  const token = params.token?.trim();
  if (!token) {
    return { required: true, success: false, errorCodes: ['missing-input-response'] };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (params.remoteIp) {
      body.set('remoteip', params.remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json().catch(() => null) as any;
    const success = Boolean(data?.success);
    const errorCodes = Array.isArray(data?.['error-codes']) ? data['error-codes'] : undefined;

    return { required: true, success, errorCodes };
  } catch {
    return { required: true, success: false, errorCodes: ['turnstile-unreachable'] };
  }
}
