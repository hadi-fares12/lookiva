export type AutoViolation = {
  reasonType: 'credential_theft' | 'payment_scam' | 'link_spam';
  confidence: number;
  details: Record<string, unknown>;
};

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const CREDENTIAL_PATTERNS = [
  /\b(send|share|give|tell)\s+(me\s+)?(your\s+)?(otp|one[- ]?time code|verification code|password|passcode|seed phrase|recovery phrase)\b/i,
  /\b(otp|verification code|password|seed phrase|recovery phrase)\s+(is|required|needed)\b/i,
];
const PAYMENT_SCAM_PATTERNS = [
  /\b(send|pay|transfer)\s+(money|cash|crypto|bitcoin|usdt)\s+(first|now|before)\b/i,
  /\b(guaranteed profit|guaranteed return|double your money|investment return guaranteed)\b/i,
  /\b(pay|send)\s+(with|using)\s+(gift card|crypto|bitcoin|usdt)\b/i,
];

export function evaluateAutomaticViolation(
  parts: Array<string | null | undefined>,
): AutoViolation | null {
  const text = parts
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 20_000);

  if (!text) return null;

  const credentialMatch = CREDENTIAL_PATTERNS.find((pattern) => pattern.test(text));
  if (credentialMatch) {
    return {
      reasonType: 'credential_theft',
      confidence: 0.99,
      details: {
        detector: 'deterministic-v1',
        signal: 'credential_request',
        sampleLength: text.length,
      },
    };
  }

  const paymentMatch = PAYMENT_SCAM_PATTERNS.find((pattern) => pattern.test(text));
  if (paymentMatch) {
    return {
      reasonType: 'payment_scam',
      confidence: 0.97,
      details: {
        detector: 'deterministic-v1',
        signal: 'high_confidence_payment_scam_phrase',
        sampleLength: text.length,
      },
    };
  }

  const urls = text.match(URL_PATTERN) ?? [];
  const normalizedUrls = urls.map((url) => url.toLowerCase());
  const repeatedUrlCount =
    normalizedUrls.length -
    new Set(normalizedUrls).size;

  if (urls.length >= 5 || (urls.length >= 3 && repeatedUrlCount >= 2)) {
    return {
      reasonType: 'link_spam',
      confidence: urls.length >= 7 ? 0.99 : 0.95,
      details: {
        detector: 'deterministic-v1',
        signal: 'excessive_or_repeated_links',
        urlCount: urls.length,
        repeatedUrlCount,
        sampleLength: text.length,
      },
    };
  }

  return null;
}
