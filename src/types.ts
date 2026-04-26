/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ServiceCategory = 'medical' | 'essentials' | 'maintenance' | 'social' | 'emergency' | 'transport';

export type ServiceTaskStatus = 
  | 'created'     // Drafted on map
  | 'funded'      // Money moved to escrow
  | 'assigned'    // Hub admin assigned provider
  | 'en_route'    // Provider clicked start
  | 'arrived'     // Within 100m geofence
  | 'checked_in'  // 4-digit code verified
  | 'in_progress' // Selfie taken, work started
  | 'completed'   // Completion photo uploaded
  | 'settled';     // Child clicked approve, funds moved to provider

export type UserRole = 'child' | 'admin' | 'provider';

export interface User {
  id: string;
  name: string;
  email: string;
  location: string;
  phoneNumber?: string;
  profileImage?: string;
  walletBalance: number;
  escrowBalance: number;
  role: UserRole;
  hubId?: string; // For providers or hub admins
}

export interface ProviderDoc {
  label: string;
  note?: string;
  url?: string;
}

export interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  skills: ServiceCategory[];
  verified: boolean;
  activeStatus: 'idle' | 'on_job' | 'offline';
  rating: number;
  totalJobs: number;
  joinedAt: string;
  /**
   * Self-declared document references collected during application. Each entry has
   * a label (e.g. "Aadhaar"), an optional note (number / extra detail), and an
   * optional URL once Supabase Storage upload is wired in. Older legacy entries
   * stored as plain strings are normalised on read by the admin UI.
   */
  verificationDocs: ProviderDoc[];
  city?: string;
  hubId?: string;
}

export interface Hub {
  id: string;
  name: string;
  city: string;
  totalProviders: number;
  activeJobs: number;
  emergencyAlerts: number;
  revenue: number;
}

export interface Parent {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  phoneNumber: string;
  whatsappNumber: string;
  address: string;
  city: 'Miryalaguda' | 'Nalgonda';
  locationPin: { lat: number; lng: number };
  medicalHistory: string;
  currentMeds: string[];
  emergencyContact: string;
  allergies?: string;
  hubId?: string;
  ownerId?: string;
  vitals?: {
    bloodPressure: string;
    heartRate: number;
    glucose: string;
    lastUpdated: string;
  };
}

export interface ServiceTask {
  id: string;
  childId: string;
  parentId: string;
  /** Hub for Socket.io room scoping; set at booking */
  hubId?: string;
  /** Assigned field agent (when set, provider portal filters on this) */
  providerId?: string;
  category: ServiceCategory;
  title: string;
  description: string;
  instructions: string;
  status: ServiceTaskStatus;
  verificationCode: string; // 4-digit code
  careManager?: {
    name: string;
    photo: string;
    verified: boolean;
  };
  evidence?: {
    commuteSelfie?: string;
    initialSelfie?: string;
    completionPhoto?: string;
    commuteStartedAt?: string;
    arrivedAt?: string;
    completedAt?: string;
    drift?: number; // Meters from target pin
  };
  createdAt: string;
  updatedAt: string;
  cost: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit' | 'escrow_lock' | 'escrow_release';
  description: string;
  timestamp: string;
  taskId?: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  timestamp: string;
  status: ServiceTaskStatus;
  note: string;
  location?: { lat: number; lng: number };
  photos?: string[];
}

export interface LocalResource {
  id: string;
  name: string;
  category: 'hospital' | 'pharmacy' | 'ambulance' | 'police' | 'other';
  address: string;
  phone: string;
  city: 'Miryalaguda' | 'Nalgonda';
  locationPin: { lat: number; lng: number };
  rating?: number;
}

export interface FamilyNote {
  id: string;
  hubId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface WalletState {
  userId: string;
  balance: number;
  escrow: number;
}

export type ChatKind = 'family' | 'provider';
export type ChatStatus = 'open' | 'awaiting_human' | 'resolved';
export type ChatAuthorRole = 'family' | 'provider' | 'admin' | 'bot';

export interface ChatThread {
  id: string;
  kind: ChatKind;
  hubId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
  unreadForAdmin: number;
  unreadForUser: number;
  lastMessage?: string;
  lastAuthorRole?: ChatAuthorRole;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  authorId: string;
  authorRole: ChatAuthorRole;
  authorName: string;
  body: string;
  createdAt: string;
  kind?: 'text' | 'faq' | 'system';
}
