/** Trusted integration payloads still need an explicit lane before reaching stock or finance. */
const legacyTestEmails = new Set([
  'galihsuks123@gmail.com', 'lunareafurniture@gmail.com', 'galih8.4.2001@gmail.com', 'uuua5021@gmail.com',
]);
const truthy = (value: unknown) => value === true || value === 1 || ['true', '1'].includes(String(value).trim().toLowerCase());

export function websitePaymentEnvironment(body: any): 'sandbox' | 'production' | 'invalid' {
  const rawMid = body.data_mid ?? body.dataMid ?? {};
  let mid: any = rawMid;
  if (typeof rawMid === 'string') { try { mid = JSON.parse(rawMid); } catch { mid = {}; } }
  const explicit = String(body.payment_environment ?? '').toLowerCase().trim();
  const saved = String(mid?._app_payment_environment ?? '').toLowerCase().trim();
  if ((explicit && !['sandbox', 'production'].includes(explicit)) || (saved && !['sandbox', 'production'].includes(saved))) return 'invalid';
  if (explicit === 'sandbox' || saved === 'sandbox' || truthy(body.is_test)) return 'sandbox';
  if (explicit === 'production' || saved === 'production') return 'production';
  const email = String(body.customer_email ?? body.email_cus ?? body.email ?? '').toLowerCase().trim();
  return legacyTestEmails.has(email) ? 'sandbox' : 'production';
}
