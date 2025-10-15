'use client';

import { useState } from 'react';
import { Partner, PartnerStatus } from '@/lib/types';

interface PartnerCardProps {
  partner: Partner;
  onRefresh?: () => void;
  onNavigateToBooking?: (bookingId: string) => void;
  onCardClick?: (partnerId: string) => void;
  isHighlighted?: boolean;
  setRef?: (el: HTMLDivElement | null) => void;
}

export default function PartnerCard({ partner, onRefresh, onNavigateToBooking, onCardClick, isHighlighted, setRef }: PartnerCardProps) {
  const [isSendingGPS, setIsSendingGPS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCardClick = () => {
    if (onCardClick && partner._id) {
      onCardClick(partner._id.toString());
    }
  };

  const handleSendGPSUpdate = async () => {
    setIsSendingGPS(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate GPS movement (small random offset)
      const currentCoords = partner.location.coordinates;
      const newCoords = [
        currentCoords[0] + (Math.random() - 0.5) * 0.01,
        currentCoords[1] + (Math.random() - 0.5) * 0.01,
      ];

      const response = await fetch(`/api/partners/${partner._id}/gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: newCoords,
          speed: Math.random() * 60,
          accuracy: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update GPS');
      }

      setSuccess('GPS location updated successfully');
      onRefresh?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingGPS(false);
    }
  };

  const getStatusColor = (status: PartnerStatus) => {
    const colors: Record<PartnerStatus, string> = {
      online: 'bg-green-100 text-green-800 border-green-300',
      offline: 'bg-gray-100 text-gray-800 border-gray-300',
      busy: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[status];
  };

  return (
    <div 
      ref={setRef}
      onClick={handleCardClick}
      className={`bg-white rounded-lg shadow-md border p-6 transition-all duration-500 cursor-pointer hover:shadow-lg ${
        isHighlighted ? 'border-indigo-500 border-4 shadow-xl ring-4 ring-indigo-200' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
          <p className="text-sm text-gray-600">{partner.email}</p>
          <p className="text-sm text-gray-600">{partner.phone}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            partner.status
          )}`}
        >
          {partner.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">City</p>
          <p className="text-sm font-medium text-gray-900">{partner.city}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Rating</p>
          <p className="text-sm font-medium text-gray-900">
            ⭐ {partner.rating?.toFixed(1) || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Deliveries</p>
          <p className="text-sm font-medium text-gray-900">{partner.totalDeliveries || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">GPS History</p>
          <p className="text-sm font-medium text-gray-900">{partner.gpsHistory?.length || 0} points</p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-xs text-gray-500 mb-1">Current Location</p>
        <p className="text-sm font-mono text-gray-700">
          {partner.location.coordinates[1].toFixed(6)}, {partner.location.coordinates[0].toFixed(6)}
        </p>
      </div>

      {partner.currentBookingId && (
        <div className="mb-4">
          <button
            onClick={() => onNavigateToBooking?.(partner.currentBookingId!)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
          >
            <span>Go to Booking</span>
          </button>
        </div>
      )}

      <button
        onClick={handleSendGPSUpdate}
        disabled={isSendingGPS || partner.status === PartnerStatus.OFFLINE}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition font-medium"
      >
        {isSendingGPS ? 'Updating...' : 'Simulate GPS Update'}
      </button>

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

