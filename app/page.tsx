'use client';

import { useEffect, useState, useCallback } from 'react';
import BookingCard from './components/BookingCard';
import PartnerCard from './components/PartnerCard';
import { Booking, Partner } from '@/lib/types';

export default function Home() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'partners'>('bookings');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'online' | 'offline' | 'busy'>('all');

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.data.bookings);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      const response = await fetch('/api/partners');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch partners');
      }

      setPartners(data.data.partners);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    await Promise.all([fetchBookings(), fetchPartners()]);

    setIsLoading(false);
  }, [fetchBookings, fetchPartners]);

  // Filter partners by status
  const filteredPartners = partners.filter(partner => {
    if (partnerFilter === 'all') return true;
    return partner.status === partnerFilter;
  });

  // Sort partners by priority: online > busy > offline
  const sortedPartners = [...filteredPartners].sort((a, b) => {
    const priority = { online: 1, busy: 2, offline: 3 };
    return priority[a.status as keyof typeof priority] - priority[b.status as keyof typeof priority];
  });

  useEffect(() => {
    // Fetch data only on initial mount
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner-Allocation Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Booking & Partner Verification System
              </p>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'bookings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bookings ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'partners'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Partners ({partners.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'bookings' ? (
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No bookings found</p>
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <BookingCard
                      key={booking._id?.toString()}
                      booking={booking}
                      onRefresh={fetchData}
                    />
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Partner Filter */}
                <div className="mb-6 flex items-center gap-4">
                  <label htmlFor="partner-filter" className="text-sm font-medium text-gray-700">
                    Filter by Status:
                  </label>
                  <select
                    id="partner-filter"
                    value={partnerFilter}
                    onChange={(e) => setPartnerFilter(e.target.value as 'all' | 'online' | 'offline' | 'busy')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Partners ({partners.length})</option>
                    <option value="online">Online ({partners.filter(p => p.status === 'online').length})</option>
                    <option value="busy">Busy ({partners.filter(p => p.status === 'busy').length})</option>
                    <option value="offline">Offline ({partners.filter(p => p.status === 'offline').length})</option>
                  </select>
                  <span className="text-sm text-gray-500">
                    Showing {sortedPartners.length} partner{sortedPartners.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedPartners.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-500">No partners found with {partnerFilter} status</p>
                    </div>
                  ) : (
                    sortedPartners.map((partner) => (
                      <PartnerCard
                        key={partner._id?.toString()}
                        partner={partner}
                        onRefresh={fetchData}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
           Suthar Dinesh - Partner Booking & Verification System
          </p>
        </div>
      </footer>
    </div>
  );
}
