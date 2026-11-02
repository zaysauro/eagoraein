/** NexCal's inherited date engine uses local civil time.
 * Vercel reserves TZ as a project environment variable; configure it in the
 * Node startup hook before any request instead. Only São Paulo is supported.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') process.env.TZ = 'America/Sao_Paulo';
}
