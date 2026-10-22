import crypto from 'crypto';

/**
 * Enterprise Financial Defense & Security Guardrails
 */
export class FinancialSecurity {
  /**
   * Constant-time comparison to protect against timing attacks on HMAC signatures
   */
  static verifyHmacSignature(rawBody: string, signature: string, secret: string, algorithm: 'sha256' | 'sha512' = 'sha256'): boolean {
    if (!rawBody || !signature || !secret) {
      return false;
    }

    try {
      const computedHash = crypto.createHmac(algorithm, secret).update(rawBody).digest('hex');
      const computedBuf = Buffer.from(computedHash, 'utf8');
      const providedBuf = Buffer.from(signature, 'utf8');

      if (computedBuf.length !== providedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuf, providedBuf);
    } catch (err) {
      console.error('Cryptographic signature verification error:', err);
      return false;
    }
  }

  /**
   * Sanitizes and validates monetary amounts to prevent negative balance attacks or floating point rounding exploits
   */
  static validateMonetaryAmount(amount: any, min = 100, max = 50_000_000): number {
    const parsed = Number(amount);

    if (isNaN(parsed) || !isFinite(parsed)) {
      throw new Error('Invalid monetary format: amount must be a finite number.');
    }

    if (parsed <= 0) {
      throw new Error('Security Violation: Monetary transaction amount must be greater than zero.');
    }

    if (parsed < min) {
      throw new Error(`Transaction amount below minimum allowed threshold (₦${min.toLocaleString()}).`);
    }

    if (parsed > max) {
      throw new Error(`Transaction amount exceeds maximum regulatory cap (₦${max.toLocaleString()}).`);
    }

    // Round to 2 decimal places to prevent floating-point precision leakage
    return Math.round((parsed + Number.EPSILON) * 100) / 100;
  }

  /**
   * Generates a tamper-evident audit hash for high-value financial receipts
   */
  static generateReceiptIntegrityHash(receipt: {
    reference: string;
    amount: number;
    invoiceId: string;
    payerName?: string;
    timestamp: number | Date;
  }, salt = 'PROXIMA_FINANCIAL_INTEGRITY_v1'): string {
    const payload = `${receipt.reference}:${receipt.amount.toFixed(2)}:${receipt.invoiceId}:${receipt.payerName || ''}:${new Date(receipt.timestamp).getTime()}`;
    return crypto.createHmac('sha256', salt).update(payload).digest('hex');
  }
}
