export function sanitizeBigInts(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeBigInts);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      sanitized[key] = sanitizeBigInts(obj[key]);
    }
    return sanitized;
  }

  return obj;
}
