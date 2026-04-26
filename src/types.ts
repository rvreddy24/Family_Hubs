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
  verificationDocs: string[]; // URLs to ID cards, etc.
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
