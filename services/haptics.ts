// Utility functions for Haptic Feedback (Vibration)

export const triggerErrorVibration = () => {
  console.log('[Haptics] Attempting Error Vibration...');
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const success = navigator.vibrate([100, 50, 200]);
    console.log(`[Haptics] Error Vibration result: ${success}`);
  } else {
    console.log('[Haptics] Vibration API not supported.');
  }
};

export const triggerSuccessVibration = () => {
  console.log('[Haptics] Attempting Success Vibration...');
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const success = navigator.vibrate([50]);
    console.log(`[Haptics] Success Vibration result: ${success}`);
  } else {
    console.log('[Haptics] Vibration API not supported.');
  }
};
