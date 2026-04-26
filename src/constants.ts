/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parent, ActivityLog, LocalResource, WalletTransaction, Provider } from './types';
import { INITIAL_HUBS, INITIAL_TASKS } from './data/initialState';
import {
  Stethoscope,
  ShoppingBag,
  Wrench,
  Heart,
  Car,
  AlertCircle
} from 'lucide-react';

/** Default profile when no account is filled in (login / landing). */
export const MOCK_USER = {
  id: 'user',
  name: 'Family member',
  email: 'family@example.com',
  location: '',
  phoneNumber: '',
  profileImage: undefined as string | undefined,
  walletBalance: 0,
  escrowBalance: 0,
  role: 'child' as const
};

export const MOCK_ADMIN = {
  id: 'admin',
  name: 'Hub admin',
  email: 'admin@example.com',
  location: '',
  profileImage: undefined as string | undefined,
  walletBalance: 0,
  escrowBalance: 0,
  role: 'admin' as const,
  hubId: 'hub_mgl'
};

export const MOCK_PROVIDER_USER = {
  id: 'provider',
  name: 'Service provider',
  email: 'provider@example.com',
  location: '',
  phoneNumber: '',
  profileImage: undefined as string | undefined,
  walletBalance: 0,
  escrowBalance: 0,
  role: 'provider' as const,
  hubId: 'hub_mgl'
};

export const MOCK_PROVIDERS: Provider[] = [];

export const MOCK_HUBS = INITIAL_HUBS;

export const MOCK_RESOURCES: LocalResource[] = [];

export const MOCK_TRANSACTIONS: WalletTransaction[] = [];

export const SERVICES = [
  { id: 'medical', title: "Health Advocacy", icon: Stethoscope, desc: "Medical escorts, lab monitoring, and dedicated health summaries.", color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'essentials', title: "Daily Logistics", icon: ShoppingBag, desc: "Grocery restocks, medicine delivery, and bill payments.", color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'maintenance', title: "Maintenance", icon: Wrench, desc: "Verified repairs, electrical work, and appliance upkeep.", color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'social', title: "Social Well-being", icon: Heart, desc: "Companionship visits, tech assistance, and walking buddies.", color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'transport', title: "Cab Service", icon: Car, desc: "Safe rides for hospital visits, temple trips, or social outings.", color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'emergency', title: "Emergency SOS", icon: AlertCircle, desc: "Immediate welfare check and real-time emergency coordination.", color: 'text-red-600', bg: 'bg-red-50' }
] as const;

export const MOCK_PARENTS: Parent[] = [];

export const MOCK_TASKS = INITIAL_TASKS;

export const MOCK_LOGS: ActivityLog[] = [];
