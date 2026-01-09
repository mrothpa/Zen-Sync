// Utility functions for Haptic Feedback (Vibration)

export const triggerErrorVibration = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    console.log('[Haptics] Triggering Error Vibration: [100, 50, 200]');
    // Pattern: 100ms on, 50ms off, 200ms on
    navigator.vibrate([100, 50, 200]);
  } else {
    console.log('[Haptics] Vibration API not supported on this device.');
  }
};

export const triggerSuccessVibration = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    console.log('[Haptics] Triggering Success Vibration: [50]');
    // Pattern: 50ms on
    navigator.vibrate([50]);
  } else {
    console.log('[Haptics] Vibration API not supported on this device.');
  }
};
