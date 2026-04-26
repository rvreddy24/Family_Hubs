/**
 * Canonical seed for tasks and hubs — server store and client hydrate from the same source.
 * Default is empty; data comes from use / DB over time.
 */
import type { ServiceTask, Hub } from '../types';

export const INITIAL_HUBS: Hub[] = [];

export const INITIAL_TASKS: ServiceTask[] = [];
