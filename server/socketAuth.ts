import type { Server } from 'socket.io';
import { createClient, type User } from '@supabase/supabase-js';

/**
 * When Supabase is configured, optionally validate JWT in handshake.
 * If no token: connection allowed (local demo / bridge mode).
 * If token invalid: reject in strict mode, or allow when STRICT_SOCKET_AUTH is not set.
 */
export function attachSocketAuth(io: Server) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const strict = process.env.STRICT_SOCKET_AUTH === '1';

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next();
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      if (strict) {
        return next(new Error('Unauthorized'));
      }
      return next();
    }
    (socket.data as { familyHubsUser?: User }).familyHubsUser = data.user;
    return next();
  });
}
