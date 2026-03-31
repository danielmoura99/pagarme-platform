// lib/mask.ts
// Utility functions for masking PII (Personally Identifiable Information)

/**
 * Mask CPF: 12345678901 → ***.***.*89-01
 * Shows only last 4 characters for identification
 */
export function maskDocument(document: string | null | undefined): string {
  if (!document) return "";
  const cleaned = document.replace(/\D/g, "");
  if (cleaned.length === 11) {
    // CPF: ***.***.X89-01
    return `***.***.*${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 14) {
    // CNPJ: **.***.***/*89-01
    return `**.***.***/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  // Unknown format: mask all but last 4
  if (cleaned.length > 4) {
    return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
  return cleaned;
}

/**
 * Mask phone: 11999998888 → (**) *****-8888
 * Shows only last 4 digits
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return `(**) *****-${cleaned.slice(-4)}`;
  }
  if (cleaned.length > 4) {
    return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
  return cleaned;
}

/**
 * Mask email: user@example.com → u***@example.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}
