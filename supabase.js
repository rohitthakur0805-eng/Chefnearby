/* ChefNearby Supabase booking integration.
 * Uses only the public/publishable key in the browser. Never put a service-role key here.
 */
(function () {
  'use strict';

  const config = window.CHEFNEARME || {};
  let client = null;

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase client library did not load. Please refresh and try again.');
    }
    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      throw new Error('Supabase configuration is missing. Please contact ChefNearby.');
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    return client;
  }

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function guestCount(raw) {
    const match = String(raw || '').match(/\d+/);
    const count = match ? Number(match[0]) : 1;
    return Math.min(500, Math.max(1, Number.isFinite(count) ? count : 1));
  }

  function dateValue() {
    return value('date') || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  }

  window.ChefNearbySupabase = {
    async submitBooking() {
      const name = value('name');
      const phone = value('phone').replace(/[\s()-]/g, '');
      const area = value('area');
      const city = value('bookingCity') || value('loc') || 'Bengaluru';
      const service = value('bservice') || 'Party Chef';
      const cuisine = value('cuisine');
      const budget = value('budget');
      const notes = value('notes');
      const date = dateValue();
      const time = value('bookingTime') || '19:00';
      const rawGuests = value('bguests');
      const guests = guestCount(rawGuests);
      const email = value('email') || null;

      if (!name || !phone || !area) {
        throw new Error('Please enter your name, WhatsApp number and area.');
      }
      if (!/^[+]?\d{10,15}$/.test(phone)) {
        throw new Error('Please enter a valid phone number (10–15 digits).');
      }
      if (date < new Date().toISOString().slice(0, 10)) {
        throw new Error('Please choose today or a future date.');
      }

      const customerNotes = [
        'Website enquiry via ChefNearby',
        'Requested city: ' + city,
        'Requested service: ' + service,
        'Cuisine: ' + (cuisine || 'Not specified'),
        'Budget: ' + (budget || 'Need a quote'),
        'Guest count entered: ' + (rawGuests || String(guests)),
        notes ? 'Customer requirements: ' + notes : ''
      ].filter(Boolean).join('\n');

      const payload = {
        p_customer_name: name,
        p_customer_phone: phone,
        p_booking_date: date,
        p_start_time: time.length === 5 ? time + ':00' : time,
        p_customer_email: email,
        p_city: city,
        p_locality: area,
        p_service_category_id: null,
        p_guest_count: guests,
        p_estimated_hours: 1,
        p_selected_dishes: [],
        p_dietary_preferences: cuisine ? [cuisine] : [],
        p_allergy_notes: null,
        p_customer_notes: customerNotes
      };

      const { data, error } = await getClient().rpc('submit_website_booking_request', payload);
      if (error) {
        console.error('ChefNearby booking RPC failed:', error);
        if (/function .*submit_website_booking_request.*not found|schema cache/i.test(error.message || '')) {
          throw new Error('Booking database function is not available yet. Please ask the admin to verify the Supabase SQL function.');
        }
        if (/row-level security|permission denied|not authorized/i.test(error.message || '')) {
          throw new Error('Supabase blocked this booking request. Please check the function grants and database permissions.');
        }
        throw new Error('Booking could not be saved: ' + (error.message || 'Unknown database error'));
      }
      if (!data || data.success !== true || !data.booking_id) {
        throw new Error((data && data.message) || 'The booking was not confirmed by the database. Please try again.');
      }

      const message = 'Hi ChefNearby, I submitted a booking request. Booking ID: ' + data.booking_id +
        '. Name: ' + name + '. Service: ' + service + '. City: ' + city + '. Area: ' + area + '. Date: ' + date +
        '. Time: ' + time + '. Guests: ' + guests + '. Cuisine: ' + (cuisine || 'Not specified') +
        '. Budget: ' + (budget || 'Need a quote') + '. Phone: ' + phone;
      const wa = String(config.whatsapp || '').replace(/\D/g, '');
      return { bookingId: data.booking_id, status: data.booking_status || 'pending',
        whatsappUrl: wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(message) : null };
    }
  };
})();