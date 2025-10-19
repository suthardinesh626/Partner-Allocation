'use client';

import { useState } from 'react';
import { Booking, DocumentStatus, BookingStatus } from '@/lib/types';

interface BookingCardProps {
  booking: Booking;
  onRefresh?: () => void;
  onNavigateToPartner?: (partnerId: string) => void;
  onCardClick?: (bookingId: string) => void;
  isHighlighted?: boolean;
  setRef?: (el: HTMLDivElement | null) => void;
}

export default function BookingCard({ booking, onRefresh, onNavigateToPartner, onCardClick, isHighlighted, setRef }: BookingCardProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCardClick = () => {
    if (onCardClick && booking._id) {
      onCardClick(booking._id.toString());
    }
  };

  const handleAssignPartner = async () => {
    setIsAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/bookings/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking._id?.toString(),
          adminId: 'admin_001', // In real app, get from auth context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign partner');
      }

      setSuccess(`Partner assigned: ${data.data.partnerName} (${Math.round(data.data.distance)}m away)`);
      onRefresh?.();
    } catch (err: any) {
      console.error('Error assigning partner:', err);
      setError(err.message || 'Failed to assign partner');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReviewDocument = async (documentType: string, status: DocumentStatus, rejectionReason?: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/bookings/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking._id?.toString(),
          documentType,
          status,
          reviewerId: 'admin_001',
          ...(rejectionReason && { rejectionReason }),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to review document');
      }
      
      setSuccess(`Document ${documentType} ${status}`);
      onRefresh?.();
    } catch (err: any) {
      console.error('Error reviewing document:', err);
      setError(err.message || 'Failed to review document');
    }
  };

  const handleConfirmBooking = async () => {
    setIsConfirming(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking._id?.toString(),
          adminId: 'admin_001',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm booking');
      }

      setSuccess('Booking confirmed successfully!');
      onRefresh?.();
    } catch (err: any) {
      console.error('Error confirming booking:', err);
      setError(err.message || 'Failed to confirm booking');
    } finally {
      setIsConfirming(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      partner_assigned: 'bg-blue-100 text-blue-800 border-blue-300',
      documents_under_review: 'bg-purple-100 text-purple-800 border-purple-300',
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const allDocumentsApproved = booking.documents.every(
    (doc) => doc.status === DocumentStatus.APPROVED
  );

  const canConfirm =
    booking.status !== BookingStatus.CONFIRMED &&
    booking.partnerId &&
    allDocumentsApproved;

  return (
    <div 
      ref={setRef}
      onClick={handleCardClick}
      className={`bg-white rounded-lg shadow-md border p-6 mb-4 transition-all duration-500 cursor-pointer hover:shadow-lg ${
        isHighlighted ? 'border-indigo-500 border-4 shadow-xl ring-4 ring-indigo-200' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {booking.userInfo.name}
          </h3>
          <p className="text-sm text-gray-600">{booking.userInfo.email}</p>
          <p className="text-sm text-gray-600">{booking.userInfo.phone}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            booking.status
          )}`}
        >
          {booking.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Address</h4>
        <p className="text-sm text-gray-600">
          {booking.address.street}, {booking.address.city}, {booking.address.state} -{' '}
          {booking.address.pincode}
        </p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Documents</h4>
        <div className="space-y-2">
          {booking.documents.map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {doc.type.replace(/_/g, ' ')}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                    doc.status
                  )}`}
                >
                  {doc.status}
                </span>
              </div>
              {doc.status === DocumentStatus.PENDING && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReviewDocument(doc.type, DocumentStatus.APPROVED)}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        handleReviewDocument(doc.type, DocumentStatus.REJECTED, reason);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {booking.partnerId && (
        <div className="mb-4">
          <button
            onClick={() => onNavigateToPartner?.(booking.partnerId!)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
          >
            <span>Go to Partner</span>
          </button>
        </div>
      )}

      <div className="flex space-x-3">
        {(booking.status === BookingStatus.PENDING || 
          booking.status === BookingStatus.DOCUMENTS_UNDER_REVIEW) && 
         !booking.partnerId && (
          <button
            onClick={handleAssignPartner}
            disabled={isAssigning}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition font-medium cursor-pointer
             "
          >
            {isAssigning ? 'Assigning...' : 'Assign Partner'}
          </button>
        )}

        {canConfirm && (
          <button
            onClick={handleConfirmBooking}
            disabled={isConfirming}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition font-medium"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Booking'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
    </div>
  );
}

