/**
 * Run: npx tsx server/realtimeHelpers.test.ts
 */
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import { mayMutateTask } from './realtimeHelpers';

// Roles are read from app_metadata only (user_metadata is not trusted for auth).
const u = (id: string, role?: string): User =>
  ({
    id,
    app_metadata: role ? { role } : {},
    user_metadata: {},
  }) as User;

assert.equal(
  mayMutateTask({ childId: 'c1', providerId: 'p1' }, u('p1', 'provider')),
  true,
  'assigned provider can mutate'
);
assert.equal(
  mayMutateTask({ childId: 'c1', providerId: 'p1' }, u('p2', 'provider')),
  false,
  'other provider cannot mutate'
);
assert.equal(
  mayMutateTask({ childId: 'c1', providerId: 'p1' }, u('admin', 'admin')),
  true,
  'admin can mutate'
);
assert.equal(
  mayMutateTask({ childId: 'c1' }, u('c1', 'child')),
  true,
  'child can mutate (own task)'
);

console.log('realtimeHelpers tests: ok');
