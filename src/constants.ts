/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parent, ServiceTask, ActivityLog, LocalResource, WalletTransaction } from './types';
import { 
  Stethoscope, 
  ShoppingBag, 
  Wrench, 
  Heart, 
  Car, 
  AlertCircle 
} from 'lucide-react';

export const MOCK_USER = {
  id: 'child_1',
  name: 'Varshith Reddy',
  email: 'rajvarshithreddy@gmail.com',
  location: 'Chicago, USA',
  phoneNumber: '+1 312 555 0123',
  profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Varshith',
  walletBalance: 450.00,
  escrowBalance: 25.00,
  role: 'child' as const
};

export const MOCK_ADMIN = {
  id: 'admin_1',
  name: 'Hub Manager',
  email: 'admin@parentlock.com',
  location: 'Miryalaguda, India',
  profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  walletBalance: 0,
  escrowBalance: 1200.00, // System wide escrow
  role: 'admin' as const,
  hubId: 'hub_mgl'
};

export const MOCK_PROVIDER_USER = {
  id: 'prov_1',
  name: 'Venu Gopal',
  email: 'venu@example.com',
  location: 'Miryalaguda, India',
  phoneNumber: '+91 98480 11223',
  profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Venu',
  walletBalance: 0,
  escrowBalance: 0,
  role: 'provider' as const,
  hubId: 'hub_mgl'
};

export const MOCK_PROVIDERS = [
  {
    id: 'prov_1',
    name: 'Venu Gopal',
    email: 'venu@example.com',
    phone: '+91 98480 11223',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Venu',
    skills: ['medical', 'transport'] as any[],
    verified: true,
    activeStatus: 'idle' as const,
    rating: 4.8,
    totalJobs: 142,
    joinedAt: '2025-01-10T10:00:00Z',
    verificationDocs: ['id_card.jpg']
  },
  {
    id: 'prov_2',
    name: 'Mahesh Kumar',
    email: 'mahesh@example.com',
    phone: '+91 99887 76655',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mahesh',
    skills: ['essentials', 'maintenance'] as any[],
    verified: true,
    activeStatus: 'on_job' as const,
    rating: 4.9,
    totalJobs: 89,
    joinedAt: '2025-02-15T10:00:00Z',
    verificationDocs: ['license.jpg']
  },
  {
    id: 'prov_3',
    name: 'Anjali Devi',
    email: 'anjali@example.com',
    phone: '+91 91234 56789',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali',
    skills: ['medical', 'social'] as any[],
    verified: false,
    activeStatus: 'offline' as const,
    rating: 0,
    totalJobs: 0,
    joinedAt: '2026-04-20T10:00:00Z',
    verificationDocs: ['nursing_cert.pdf']
  }
];

export const MOCK_HUBS = [
  {
    id: 'hub_mgl',
    name: 'Miryalaguda Hub',
    city: 'Miryalaguda',
    totalProviders: 84,
    activeJobs: 12,
    emergencyAlerts: 0,
    revenue: 4500
  },
  {
    id: 'hub_nlg',
    name: 'Nalgonda Hub',
    city: 'Nalgonda',
    totalProviders: 126,
    activeJobs: 28,
    emergencyAlerts: 1,
    revenue: 8200
  }
];

export const MOCK_RESOURCES: LocalResource[] = [
  {
    id: 'res_1',
    name: 'KIMS Hospital',
    category: 'hospital',
    address: 'Sagar Road, Miryalaguda',
    phone: '+91 8689 123456',
    city: 'Miryalaguda',
    locationPin: { lat: 17.1883, lng: 79.5644 },
    rating: 4.5
  },
  {
    id: 'res_2',
    name: 'Apollo Pharmacy',
    category: 'pharmacy',
    address: 'Main Bazaar, Nalgonda',
    phone: '+91 8682 987654',
    city: 'Nalgonda',
    locationPin: { lat: 17.0575, lng: 79.2684 },
    rating: 4.2
  },
  {
    id: 'res_3',
    name: 'LifeLine Ambulance',
    category: 'ambulance',
    address: 'Miryalaguda Town',
    phone: '+91 91234 56789',
    city: 'Miryalaguda',
    locationPin: { lat: 17.1883, lng: 79.5644 },
  }
];

export const MOCK_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx_1',
    userId: 'child_1',
    amount: -15.00,
    type: 'escrow_lock',
    description: 'Escrow Lock: Monthly Cardiac Checkup #task_1',
    timestamp: '2026-04-20T10:05:00Z',
    taskId: 'task_1'
  },
  {
    id: 'tx_2',
    userId: 'child_1',
    amount: -15.00,
    type: 'escrow_release',
    description: 'Settled: Funds released to Venu Gopal #task_1',
    timestamp: '2026-04-20T14:30:00Z',
    taskId: 'task_1'
  },
  {
    id: 'tx_3',
    userId: 'child_1',
    amount: 500.00,
    type: 'credit',
    description: 'Wallet Recharge - Credit Card x-4421',
    timestamp: '2026-04-15T10:00:00Z'
  },
  {
    id: 'tx_4',
    userId: 'child_1',
    amount: -10.00,
    type: 'escrow_lock',
    description: 'Escrow Lock: Weekly Grocery Restock #task_2',
    timestamp: '2026-04-25T08:05:00Z',
    taskId: 'task_2'
  }
];

export const SERVICES = [
  { id: 'medical', title: "Health Advocacy", icon: Stethoscope, desc: "Medical escorts, lab monitoring, and dedicated health summaries.", color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'essentials', title: "Daily Logistics", icon: ShoppingBag, desc: "Grocery restocks, medicine delivery, and bill payments.", color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'maintenance', title: "Maintenance", icon: Wrench, desc: "Verified repairs, electrical work, and appliance upkeep.", color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'social', title: "Social Well-being", icon: Heart, desc: "Companionship visits, tech assistance, and walking buddies.", color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'transport', title: "Cab Service", icon: Car, desc: "Safe rides for hospital visits, temple trips, or social outings.", color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'emergency', title: "Emergency SOS", icon: AlertCircle, desc: "Immediate welfare check and real-time emergency coordination.", color: 'text-red-600', bg: 'bg-red-50' }
] as const;

export const MOCK_PARENTS: Parent[] = [
  {
    id: 'parent_1',
    name: 'Raghava Reddy',
    age: 68,
    gender: 'Male',
    bloodGroup: 'B+',
    phoneNumber: '+91 94401 23456',
    whatsappNumber: '+91 94401 23456',
    address: 'H.No 4-12, Housing Board Colony, Miryalaguda',
    city: 'Miryalaguda',
    locationPin: { lat: 17.1883, lng: 79.5644 },
    medicalHistory: 'Hypertension, Type 2 Diabetes',
    currentMeds: ['Amlodipine 5mg', 'Metformin 500mg'],
    emergencyContact: '+91 98765 43210 (Neighbor)',
    allergies: 'None',
    vitals: {
      bloodPressure: '130/85',
      heartRate: 72,
      glucose: '110 mg/dL',
      lastUpdated: '2024-03-24'
    }
  }
];

export const MOCK_TASKS: ServiceTask[] = [
  {
    id: 'task_1',
    childId: 'child_1',
    parentId: 'parent_1',
    category: 'medical',
    title: 'Monthly Cardiac Checkup',
    description: 'Routine checkup with Dr. Rao at KIMS Hospital',
    instructions: 'Ensure Dad carries his previous reports. Please hold his hand while walking up the stairs.',
    status: 'settled',
    verificationCode: '8842',
    careManager: {
      name: 'Venu Gopal',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Venu',
      verified: true
    },
    evidence: {
      initialSelfie: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
      completionPhoto: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=400',
      arrivedAt: '2026-04-20T10:45:00Z',
      completedAt: '2026-04-20T13:30:00Z',
      drift: 12
    },
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-04-20T13:30:00Z',
    cost: 15.00
  },
  {
    id: 'task_2',
    childId: 'child_1',
    parentId: 'parent_1',
    category: 'essentials',
    title: 'Weekly Grocery Restock',
    description: 'Fresh fruits and organic vegetables',
    instructions: 'Get the special mangoes he likes from the local market.',
    status: 'in_progress',
    verificationCode: '1092',
    careManager: {
      name: 'Mahesh Kumar',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mahesh',
      verified: true
    },
    evidence: {
      commuteSelfie: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=400',
      initialSelfie: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=400',
      commuteStartedAt: '2026-04-25T08:35:00Z',
      arrivedAt: '2026-04-25T09:05:00Z',
      drift: 4
    },
    createdAt: '2026-04-25T08:00:00Z',
    updatedAt: '2026-04-25T09:15:00Z',
    cost: 10.00
  }
];

export const MOCK_LOGS: ActivityLog[] = [
  {
    id: 'log_pre',
    taskId: 'task_2',
    timestamp: '2026-04-25T08:35:00Z',
    status: 'en_route',
    note: 'Universal Safety Relay: Identity photo uploaded 30m prior and sent to parent WhatsApp.',
  },
  {
    id: 'log_1',
    taskId: 'task_2',
    timestamp: '2026-04-25T09:05:00Z',
    status: 'arrived',
    note: 'Mahesh reached the Miryalaguda home. GPS drift: 4m.',
    location: { lat: 17.1883, lng: 79.5644 }
  },
  {
    id: 'log_2',
    taskId: 'task_2',
    timestamp: '2026-04-25T09:12:00Z',
    status: 'checked_in',
    note: 'Shared secret verified. Security handshake complete.',
  }
];
