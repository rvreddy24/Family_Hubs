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
    // #region agent log
    fetch('http://127.0.0.1:7598/ingest/cb2fe1b3-4802-4408-9788-1811b0db491c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a9e75'},body:JSON.stringify({sessionId:'5a9e75',runId:'baseline',hypothesisId:'H1',location:'server/socketAuth.ts:23',message:'Socket auth middleware',data:{strict,hasToken:!!token},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!token) {
      return next();
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      // #region agent log
      fetch('http://127.0.0.1:7598/ingest/cb2fe1b3-4802-4408-9788-1811b0db491c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a9e75'},body:JSON.stringify({sessionId:'5a9e75',runId:'baseline',hypothesisId:'H1',location:'server/socketAuth.ts:31',message:'Socket auth failed',data:{strict,hasUser:false,errorMsg:String(error?.message||'')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (strict) {
        return next(new Error('Unauthorized'));
      }
      return next();
    }
    (socket.data as { familyHubsUser?: User }).familyHubsUser = data.user;
    // #region agent log
    fetch('http://127.0.0.1:7598/ingest/cb2fe1b3-4802-4408-9788-1811b0db491c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a9e75'},body:JSON.stringify({sessionId:'5a9e75',runId:'baseline',hypothesisId:'H1',location:'server/socketAuth.ts:41',message:'Socket auth ok',data:{hasUser:true,role:String(((data.user?.app_metadata as any)?.role)||'')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return next();
  });
}
