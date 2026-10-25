// @ts-ignore
import * as jsrsasignLib from 'jsrsasign';
const jsrsasign: any = jsrsasignLib;

const GATE_SECRET = 'hiicine_demo_secret_2025';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface GateValidationResult {
  hasAccess: boolean;
  reason: 'localhost_bypass' | 'valid_session' | 'valid_token' | 'unauthorized';
}

export const authGate = {
  /**
   * Check if running on local development host
   */
  isLocalhost(): boolean {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '';
  },

  /**
   * Validate current visitor credentials
   */
  checkAccess(): GateValidationResult {
    // 1. Local development bypass
    if (this.isLocalhost()) {
      return { hasAccess: true, reason: 'localhost_bypass' };
    }

    // 2. Active session storage flag
    const sessionValid = sessionStorage.getItem('hiiCineSessionValidated') === '1';
    const lastAccess = localStorage.getItem('hiiCineLastAccess');
    const isRecent = lastAccess && (Date.now() - parseInt(lastAccess, 10) < TOKEN_TTL_MS);

    if (sessionValid && isRecent) {
      return { hasAccess: true, reason: 'valid_session' };
    }

    // 3. Persistent 24h token check
    const tokenReceived = localStorage.getItem('hicine_token_received') === 'true';
    const tokenTimestamp = localStorage.getItem('hicine_token_timestamp');

    if (tokenReceived && tokenTimestamp) {
      const elapsed = Date.now() - parseInt(tokenTimestamp, 10);
      if (elapsed < TOKEN_TTL_MS) {
        sessionStorage.setItem('hiiCineSessionValidated', '1');
        return { hasAccess: true, reason: 'valid_token' };
      }
    }

    // 4. URL Token verification (?from=hicine&token=...)
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('from');
    const tokenParam = params.get('token');

    if (fromParam === 'hicine' && tokenParam) {
      try {
        const isValid = jsrsasign.jws.JWS.verify(tokenParam, GATE_SECRET, ['HS256']);
        if (isValid) {
          const payloadStr = jsrsasign.jws.JWS.readSafeJSONString(
            jsrsasign.b64utoutf8(tokenParam.split('.')[1])
          );
          const payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
          const nowSec = Math.floor(Date.now() / 1000);

          if (payload && payload.verified && (!payload.exp || nowSec <= payload.exp)) {
            localStorage.setItem('hicine_token_received', 'true');
            localStorage.setItem('hicine_token_timestamp', Date.now().toString());
            localStorage.setItem('hiiCineLastAccess', Date.now().toString());
            sessionStorage.setItem('hiiCineSessionValidated', '1');
            return { hasAccess: true, reason: 'valid_token' };
          }
        }
      } catch (err) {
        console.warn('JWS Token verification error:', err);
      }
    }

    return { hasAccess: false, reason: 'unauthorized' };
  },

  /**
   * Reset authentication state
   */
  clearAuth(): void {
    localStorage.removeItem('hicine_token_received');
    localStorage.removeItem('hicine_token_timestamp');
    localStorage.removeItem('hiiCineLastAccess');
    sessionStorage.removeItem('hiiCineSessionValidated');
  }
};
