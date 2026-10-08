import { describe, expect, it } from 'vitest';
import { evaluateAutomaticViolation } from '../auto-violation';

describe('automatic moderation violation detector', () => {
  it('leaves normal salon and booking text unflagged', () => {
    expect(
      evaluateAutomaticViolation([
        'Fresh fade and beard trim',
        'Book your appointment for Saturday. Aftercare instructions are included.',
      ]),
    ).toBeNull();
  });

  it('flags credential theft language at very high confidence', () => {
    const result = evaluateAutomaticViolation([
      'Send me your OTP verification code so I can confirm your account.',
    ]);

    expect(result).toMatchObject({
      reasonType: 'credential_theft',
      confidence: 0.99,
    });
  });

  it('flags high-confidence payment scam language', () => {
    const result = evaluateAutomaticViolation([
      'Guaranteed profit. Send money first and I will double your money.',
    ]);

    expect(result?.reasonType).toBe('payment_scam');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.97);
  });

  it('flags excessive repeated links without flagging one normal link', () => {
    expect(
      evaluateAutomaticViolation(['Portfolio: https://lookiva.example/work']),
    ).toBeNull();

    const result = evaluateAutomaticViolation([
      [
        'https://spam.example/a',
        'https://spam.example/a',
        'https://spam.example/a',
        'https://spam.example/b',
        'https://spam.example/c',
      ].join(' '),
    ]);

    expect(result?.reasonType).toBe('link_spam');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.95);
  });
});
