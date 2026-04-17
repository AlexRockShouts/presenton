/**
 * No-op stub for Mixpanel tracking (privacy compliance).
 */
export const trackEvent = (event: string, properties?: Record<string, any>): void => {
  // No operation: Mixpanel removed
};

export const MixpanelEvent = {} as Record<string, string>;
