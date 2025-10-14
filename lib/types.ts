import { ObjectId } from 'mongodb';

// Geospatial coordinates type
export interface Coordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// Document status enum
export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Booking status enum
export enum BookingStatus {
  PENDING = 'pending',
  PARTNER_ASSIGNED = 'partner_assigned',
  DOCUMENTS_UNDER_REVIEW = 'documents_under_review',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

// Partner status enum
export enum PartnerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
}

// Document type
export interface Document {
  type: 'selfie' | 'signature' | 'id_proof' | 'address_proof';
  url: string;
  status: DocumentStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

// Address type
export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  coordinates: Coordinates;
}

// User information
export interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

// Booking interface
export interface Booking {
  _id?: ObjectId;
  userId: string;
  userInfo: UserInfo;
  address: Address;
  documents: Document[];
  status: BookingStatus;
  partnerId?: string;
  partnerAssignedAt?: Date;
  partnerAssignedBy?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Partner GPS history entry
export interface GPSHistory {
  coordinates: Coordinates;
  timestamp: Date;
  speed?: number;
  accuracy?: number;
}

// Partner interface
export interface Partner {
  _id?: ObjectId;
  name: string;
  email: string;
  phone: string;
  city: string;
  location: Coordinates;
  status: PartnerStatus;
  currentBookingId?: string;
  gpsHistory: GPSHistory[];
  rating?: number;
  totalDeliveries?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Rate limit response
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

// Partner assignment request
export interface AssignPartnerRequest {
  bookingId: string;
  adminId: string;
}

// Partner assignment response
export interface AssignPartnerResponse {
  bookingId: string;
  partnerId: string;
  partnerName: string;
  distance: number;
}

// Document review request
export interface ReviewDocumentRequest {
  bookingId: string;
  documentType: string;
  status: DocumentStatus;
  reviewerId: string;
  rejectionReason?: string;
}

// Confirm booking request
export interface ConfirmBookingRequest {
  bookingId: string;
  adminId: string;
}

// GPS update request
export interface GPSUpdateRequest {
  partnerId: string;
  coordinates: [number, number]; // [longitude, latitude]
  speed?: number;
  accuracy?: number;
}

// Real-time event types
export interface BookingConfirmedEvent {
  bookingId: string;
  partnerId: string;
  confirmedAt: Date;
  confirmedBy: string;
}

export interface PartnerGPSUpdateEvent {
  partnerId: string;
  bookingId?: string;
  coordinates: Coordinates;
  timestamp: Date;
}

export interface BookingAssignedEvent {
  bookingId: string;
  partnerId: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface DocumentReviewedEvent {
  bookingId: string;
  documentType: string;
  status: DocumentStatus;
  reviewedBy: string;
  reviewedAt: Date;
}

