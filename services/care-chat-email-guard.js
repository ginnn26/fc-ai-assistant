const crypto = require('node:crypto');

// Short-lived, bounded process-local resend protection. The mail provider must
// still enforce distributed limits; this is not identity or membership proof.
function createEmailResendGuard({ now = Date.now, cooldownMs = 60000, maxEntries = 2000 } = {}) {
  const entries = new Map();
  return {
    reserve(email) {
      const time = now();
      for (const [key, expires] of entries) if (expires <= time) entries.delete(key);
      const key = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
      const existing = entries.get(key);
      if (existing) return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing - time) / 1000)) };
      if (entries.size >= maxEntries) return { allowed: false, retryAfter: Math.max(1, Math.ceil((Math.min(...entries.values()) - time) / 1000)) };
      // Reserve before sending, including failures/ambiguous provider outcomes.
      entries.set(key, time + cooldownMs);
      return { allowed: true };
    },
  };
}
module.exports = { createEmailResendGuard };
