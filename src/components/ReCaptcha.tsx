import { useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';

// reCAPTCHA v3 site key - this is public and safe to expose
// You need to get your own key from https://www.google.com/recaptcha/admin
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key - replace with real key

export interface ReCaptchaRef {
  executeAsync: () => Promise<string | null>;
}

interface ReCaptchaProps {
  onVerify?: (token: string) => void;
  onError?: (error: Error) => void;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(
  ({ onVerify, onError }, ref) => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      // Check if script already exists
      if (document.querySelector(`script[src*="recaptcha"]`)) {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => setIsReady(true));
        }
        return;
      }

      // Load reCAPTCHA script
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        window.grecaptcha.ready(() => {
          setIsReady(true);
        });
      };
      
      script.onerror = () => {
        onError?.(new Error('Failed to load reCAPTCHA'));
      };

      document.head.appendChild(script);

      return () => {
        // Don't remove the script on unmount as it might be needed elsewhere
      };
    }, [onError]);

    const executeAsync = useCallback(async (): Promise<string | null> => {
      if (!isReady || !window.grecaptcha) {
        console.warn('reCAPTCHA not ready');
        return null;
      }

      try {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' });
        onVerify?.(token);
        return token;
      } catch (error) {
        console.error('reCAPTCHA execution failed:', error);
        onError?.(error as Error);
        return null;
      }
    }, [isReady, onVerify, onError]);

    useImperativeHandle(ref, () => ({
      executeAsync
    }), [executeAsync]);

    // reCAPTCHA v3 is invisible, no UI needed
    return null;
  }
);

ReCaptcha.displayName = 'ReCaptcha';