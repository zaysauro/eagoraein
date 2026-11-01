// Legacy MultiWA transport removed. No customer messages are sent by these hooks.
// Durable notifications require the official provider adapter and explicit enablement.
export function notifyBookingReceived(...args: unknown[]): void { void args; }
export function notifyBookingConfirmed(...args: unknown[]): void { void args; }
export function notifyBookingCancelled(...args: unknown[]): void { void args; }
