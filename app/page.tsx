'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import BookingCard from './components/BookingCard';
import PartnerCard from './components/PartnerCard';
import { Booking, Partner } from '@/lib/types';

// Utility functions for localStorage
const LAST_CLICKED_KEY = 'last_clicked_card';

interface LastClickedCard {
  id: string;
  type: 'booking' | 'partner';
  timestamp: number;
}

const saveLastClickedCard = (id: string, type: 'booking' | 'partner') => {
  const data: LastClickedCard = {
    id,
    type,
    timestamp: Date.now()
  };
  localStorage.setItem(LAST_CLICKED_KEY, JSON.stringify(data));
};

const getLastClickedCard = (): LastClickedCard | null => {
  try {
    const stored = localStorage.getItem(LAST_CLICKED_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored) as LastClickedCard;
    // Only consider cards clicked within the last 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - data.timestamp > thirtyMinutes) {
      localStorage.removeItem(LAST_CLICKED_KEY);
      return null;
    }
    
    return data;
  } catch {
    localStorage.removeItem(LAST_CLICKED_KEY);
    return null;
  }
};

export default function Home() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'partners'>('bookings');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'online' | 'offline' | 'busy'>('all');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'unassigned' | 'assigned' | 'pending' | 'documents_under_review' | 'partner_assigned' | 'confirmed' | 'cancelled'>('all');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  
  const bookingRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const partnerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // Filter bookings by status or assignment
  const filteredBookings = bookings.filter(booking => {
    if (bookingFilter === 'all') return true;
    if (bookingFilter === 'unassigned') return !booking.partnerId;
    if (bookingFilter === 'assigned') return !!booking.partnerId;
    return booking.status === bookingFilter;
  });

  // Sort bookings: unassigned first, then by status priority
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    // First priority: unassigned bookings come first
    if (!a.partnerId && b.partnerId) return -1;
    if (a.partnerId && !b.partnerId) return 1;
    
    // Second priority: sort by status
    const statusPriority = { 
      pending: 1, 
      documents_under_review: 2, 
      partner_assigned: 3, 
      confirmed: 4, 
      cancelled: 5 
    };
    return (statusPriority[a.status as keyof typeof statusPriority] || 999) - 
           (statusPriority[b.status as keyof typeof statusPriority] || 999);
  });

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

  // Navigate to a partner card
  const navigateToPartner = useCallback((partnerId: string) => {
    saveLastClickedCard(partnerId, 'partner');
    setActiveTab('partners');
    setHighlightedId(partnerId);
    setTimeout(() => {
      const element = partnerRefs.current.get(partnerId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after 8 seconds to match click behavior
        setTimeout(() => {
          setHighlightedId(current => current === partnerId ? null : current);
        }, 8000);
      }
    }, 100);
  }, []);

  // Navigate to a booking card
  const navigateToBooking = useCallback((bookingId: string) => {
    saveLastClickedCard(bookingId, 'booking');
    setActiveTab('bookings');
    setHighlightedId(bookingId);
    setTimeout(() => {
      const element = bookingRefs.current.get(bookingId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after 8 seconds to match click behavior
        setTimeout(() => {
          setHighlightedId(current => current === bookingId ? null : current);
        }, 8000);
      }
    }, 100);
  }, []);

  // Handle card clicks to save last clicked card
  const handleBookingCardClick = useCallback((bookingId: string) => {
    saveLastClickedCard(bookingId, 'booking');
    setHighlightedId(bookingId);
    // Extend highlight duration to 8 seconds to account for potential data refreshes
    setTimeout(() => {
      // Only clear if this is still the highlighted card
      setHighlightedId(current => current === bookingId ? null : current);
    }, 8000);
  }, []);

  const handlePartnerCardClick = useCallback((partnerId: string) => {
    saveLastClickedCard(partnerId, 'partner');
    setHighlightedId(partnerId);
    // Extend highlight duration to 8 seconds to account for potential data refreshes
    setTimeout(() => {
      // Only clear if this is still the highlighted card
      setHighlightedId(current => current === partnerId ? null : current);
    }, 8000);
  }, []);

  // Restore and scroll to last clicked card
  const restoreLastClickedCard = useCallback(() => {
    // On initial load, restore from localStorage
    if (isInitialLoad) {
      const lastClicked = getLastClickedCard();
      if (lastClicked) {
        const { id, type } = lastClicked;
        setActiveTab(type === 'booking' ? 'bookings' : 'partners');
        setHighlightedId(id);
        
        // Schedule initial scroll and highlight clear
        setTimeout(() => {
          const refs = type === 'booking' ? bookingRefs : partnerRefs;
          const element = refs.current.get(id);
          
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Clear highlight after 10 seconds for initial restoration
            setTimeout(() => {
              setHighlightedId(current => current === id ? null : current);
            }, 10000);
          }
        }, 200);
      }
      setIsInitialLoad(false);
      return;
    }

    // On data refresh, scroll to currently highlighted card if any
    if (highlightedId) {
      const lastClicked = getLastClickedCard();
      if (lastClicked && lastClicked.id === highlightedId) {
        setTimeout(() => {
          const refs = lastClicked.type === 'booking' ? bookingRefs : partnerRefs;
          const element = refs.current.get(highlightedId);
          
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [isInitialLoad, highlightedId]);

  useEffect(() => {
    // Fetch data only on initial mount
    fetchData();
  }, [fetchData]);

  // Restore last clicked card after data is loaded
  useEffect(() => {
    if (!isLoading && (bookings.length > 0 || partners.length > 0)) {
      restoreLastClickedCard();
    }
  }, [isLoading, bookings.length, partners.length, restoreLastClickedCard]);

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
              <>
                {/* Booking Filter */}
                <div className="mb-6 flex items-center gap-4">
                  <label htmlFor="booking-filter" className="text-sm font-bold text-gray-700">
                    Filter by:
                  </label>
                  <select
                    id="booking-filter"
                    value={bookingFilter}
                    onChange={(e) => setBookingFilter(e.target.value as typeof bookingFilter)}
                    className="px-4 py-2 border-2 border-gray-500 font-medium text-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Bookings ({bookings.length})</option>
                    <option value="pending">Pending ({bookings.filter(b => b.status === 'pending').length})</option>
                    <option value="documents_under_review">Under Review ({bookings.filter(b => b.status === 'documents_under_review').length})</option>
                    <option value="partner_assigned">Partner Assigned ({bookings.filter(b => b.status === 'partner_assigned').length})</option>
                    <option value="confirmed">Confirmed ({bookings.filter(b => b.status === 'confirmed').length})</option>
                  </select>
                  <span className="text-sm text-gray-500">
                    Showing {sortedBookings.length} booking{sortedBookings.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {sortedBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No bookings found matching the filter</p>
                    </div>
                  ) : (
                    sortedBookings.map((booking) => (
                      <BookingCard
                        key={booking._id?.toString()}
                        booking={booking}
                        onRefresh={fetchData}
                        onNavigateToPartner={navigateToPartner}
                        onCardClick={handleBookingCardClick}
                        isHighlighted={highlightedId === booking._id?.toString()}
                        setRef={(el) => {
                          if (el && booking._id) {
                            bookingRefs.current.set(booking._id.toString(), el);
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Partner Filter */}
                <div className="mb-6 flex items-center gap-4">
                  <label htmlFor="partner-filter" className="text-sm font-bold text-gray-700">
                    Filter by Status:
                  </label>
                  <select
                    id="partner-filter"
                    value={partnerFilter}
                    onChange={(e) => setPartnerFilter(e.target.value as 'all' | 'online' | 'offline' | 'busy')}
                    className="px-4 py-2 border-2 border-gray-500 font-medium text-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        onNavigateToBooking={navigateToBooking}
                        onCardClick={handlePartnerCardClick}
                        isHighlighted={highlightedId === partner._id?.toString()}
                        setRef={(el) => {
                          if (el && partner._id) {
                            partnerRefs.current.set(partner._id.toString(), el);
                          }
                        }}
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
