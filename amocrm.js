/**
 * ============================================================
 * LIME CLINIC — AmoCRM Client-Side Integration
 * ============================================================
 * Intercepts booking form submissions and sends lead data to
 * the proxy server (server.js), which then forwards to AmoCRM.
 *
 * Usage:
 *   - Include this script AFTER script.js on pages with booking forms
 *   - The AmoCRM class is auto-initialized on DOMContentLoaded
 *   - It patches BookingModal.submitForm and page booking form
 * ============================================================
 */

'use strict';

class AmoCRM {
  /**
   * @param {Object} options
   * @param {string} options.apiBase  - Base URL of proxy server (default '/api')
   * @param {boolean} options.debug   - Enable console logging
   */
  constructor(options = {}) {
    this.apiBase = options.apiBase || '/api';
    this.debug = options.debug || false;
    this._log('AmoCRM integration initialized, apiBase:', this.apiBase);
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  /**
   * Submit a lead to AmoCRM via the proxy server.
   * @param {Object} data - Lead data (see format below)
   * @returns {Promise<{success: boolean, leadId: number|null, error: string|null}>}
   *
   * Data format:
   * {
   *   name:    "Patient full name",
   *   phone:   "+7...",
   *   email:   "optional@email.kz",
   *   service: "Service name",
   *   doctor:  "Doctor name",
   *   date:    "2025-01-15",
   *   time:    "10:00",
   *   comment: "Any notes",
   *   source:  "website_booking",
   *   page:    "booking.html"
   * }
   */
  async submitLead(data) {
    const payload = {
      name:    this._sanitize(data.name    || ''),
      phone:   this._sanitize(data.phone   || ''),
      email:   this._sanitize(data.email   || ''),
      service: this._sanitize(data.service || ''),
      doctor:  this._sanitize(data.doctor  || ''),
      date:    this._sanitize(data.date    || ''),
      time:    this._sanitize(data.time    || ''),
      comment: this._sanitize(data.comment || ''),
      source:  data.source || 'website_booking',
      page:    data.page   || (typeof location !== 'undefined' ? location.pathname.split('/').pop() : 'unknown'),
    };

    this._log('Submitting lead:', payload);

    try {
      const response = await fetch(`${this.apiBase}/amocrm/lead`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        this._log('Server error:', result);
        return { success: false, leadId: null, error: result.message || 'Server error' };
      }

      this._log('Lead created successfully:', result);
      return { success: true, leadId: result.leadId || null, error: null };

    } catch (err) {
      this._log('Network error:', err.message);
      // Do not block the booking flow on network errors — return soft failure
      return { success: false, leadId: null, error: err.message };
    }
  }

  /**
   * Track a page view in AmoCRM (fire-and-forget).
   */
  trackPageView() {
    const data = {
      page:  typeof location !== 'undefined' ? location.pathname : '/',
      title: typeof document !== 'undefined' ? document.title : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      ts:    new Date().toISOString(),
    };
    this._fireAndForget(`${this.apiBase}/amocrm/track`, data);
  }

  /**
   * Track a WhatsApp button click (fire-and-forget).
   */
  trackWhatsAppClick() {
    const data = {
      event: 'whatsapp_click',
      page:  typeof location !== 'undefined' ? location.pathname : '/',
      ts:    new Date().toISOString(),
    };
    this._fireAndForget(`${this.apiBase}/amocrm/track`, data);
  }

  // ----------------------------------------------------------
  // BOOKING FORM INTEGRATION
  // ----------------------------------------------------------

  /**
   * Patch the global BookingModal.submitForm so it sends to AmoCRM.
   * Call this after DOMContentLoaded once BookingModal is initialized.
   */
  patchModalBooking() {
    if (typeof window.BookingModal === 'undefined') {
      this._log('BookingModal not found — skipping modal patch');
      return;
    }

    const self = this;
    const originalClose = window.BookingModal.close.bind(window.BookingModal);

    // We intercept the "Подтвердить запись" button click (step 4 → submit)
    // by observing the next button in the modal
    const nextBtn = document.getElementById('modal-next');
    if (!nextBtn) {
      this._log('modal-next button not found — skipping modal patch');
      return;
    }

    // Wrap the existing click listener by adding our own listener
    nextBtn.addEventListener('click', async () => {
      // Only fire on the last step (the submit step)
      const step4 = document.getElementById('modal-step-4');
      if (!step4 || !step4.classList.contains('active')) return;

      // Check required fields are filled (BookingModal already validates)
      const name  = document.getElementById('modal-name');
      const phone = document.getElementById('modal-phone');
      const email = document.getElementById('modal-email');

      if (!name || !name.value.trim()) return;
      if (!phone || !phone.value.trim()) return;

      // Collect booking state from BookingModal internals
      // The modal renders success HTML, so we grab data before that happens
      const selectedDoctor = self._getModalSelectedDoctor();
      const selectedDate   = self._getModalSelectedDate();
      const selectedTime   = self._getModalSelectedTime();

      const leadData = {
        name:    name.value.trim(),
        phone:   phone.value.trim(),
        email:   email ? email.value.trim() : '',
        service: 'Консультация уролога/андролога',
        doctor:  selectedDoctor,
        date:    selectedDate,
        time:    selectedTime,
        comment: self._getModalComment(),
        source:  'website_modal',
        page:    typeof location !== 'undefined' ? location.pathname.split('/').pop() : 'modal',
      };

      self._log('Modal booking submit — sending to AmoCRM:', leadData);
      // Fire and forget — don't await to avoid blocking the UI success screen
      self.submitLead(leadData).then(result => {
        self._log('AmoCRM modal lead result:', result);
      });
    });

    this._log('Modal booking patched successfully');
  }

  /**
   * Patch the page booking form (booking.html full-page form).
   * Call this after DOMContentLoaded.
   */
  patchPageBookingForm() {
    const submitBtn = document.getElementById('page-submit-btn');
    if (!submitBtn) {
      this._log('page-submit-btn not found — skipping page form patch');
      return;
    }

    const self = this;

    submitBtn.addEventListener('click', async () => {
      const name  = document.getElementById('page-name');
      const phone = document.getElementById('page-phone');

      if (!name || !name.value.trim()) return;
      if (!phone || !phone.value.trim()) return;

      // Show loading indicator on button
      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправка...';
      submitBtn.disabled = true;

      const leadData = {
        name:    name.value.trim(),
        phone:   phone.value.trim(),
        email:   (document.querySelector('#page-booking-form input[type="email"]') || {}).value || '',
        service: self._getPageSelectedService(),
        doctor:  self._getPageSelectedDoctor(),
        date:    self._getPageSelectedDate(),
        time:    self._getPageSelectedTime(),
        comment: (document.querySelector('#page-booking-form textarea') || {}).value || '',
        source:  'website_booking_page',
        page:    'booking.html',
      };

      self._log('Page form submit — sending to AmoCRM:', leadData);

      const result = await self.submitLead(leadData);
      self._log('AmoCRM page form lead result:', result);

      // Restore button regardless of result (the page form JS handles step navigation)
      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
    });

    this._log('Page booking form patched successfully');
  }

  // ----------------------------------------------------------
  // WHATSAPP TRACKING
  // ----------------------------------------------------------

  /**
   * Attach WhatsApp click tracking to all .wa-btn elements.
   */
  attachWhatsAppTracking() {
    const self = this;
    document.querySelectorAll('.wa-btn, a[href*="whatsapp"], a[href*="wa.me"]').forEach(el => {
      el.addEventListener('click', () => {
        self.trackWhatsAppClick();
        self._log('WhatsApp click tracked');
      });
    });
  }

  // ----------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------

  _sanitize(str) {
    return String(str).slice(0, 500).trim();
  }

  _log(...args) {
    if (this.debug) {
      console.log('[AmoCRM]', ...args);
    }
  }

  _fireAndForget(url, data) {
    fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }).catch(err => this._log('Track error (ignored):', err.message));
  }

  _getModalSelectedDoctor() {
    const selected = document.querySelector('.doc-select-card.selected');
    return selected ? (selected.dataset.doctor || '') : '';
  }

  _getModalSelectedDate() {
    const selectedDay = document.querySelector('#modal-calendar .cal-day.selected');
    if (!selectedDay) return '';
    // Try to get date from the onclick attribute pattern: BookingModal._selectDate(y, m, d)
    const onclick = selectedDay.getAttribute('onclick') || '';
    const match = onclick.match(/_selectDate\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const y = parseInt(match[1]);
      const m = parseInt(match[2]) + 1; // JS months are 0-based
      const d = parseInt(match[3]);
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return selectedDay.textContent.trim() ? selectedDay.textContent.trim() : '';
  }

  _getModalSelectedTime() {
    const selected = document.querySelector('#modal-times .time-slot.selected');
    return selected ? selected.textContent.trim() : '';
  }

  _getModalComment() {
    const textarea = document.querySelector('#modal-step-4 textarea');
    return textarea ? textarea.value.trim() : '';
  }

  _getPageSelectedService() {
    const cat = document.getElementById('service-cat');
    const specific = document.getElementById('service-specific');
    const parts = [];
    if (cat && cat.value) parts.push(cat.options[cat.selectedIndex].text);
    if (specific && specific.value) parts.push(specific.options[specific.selectedIndex].text);
    return parts.join(' — ') || 'Не указана';
  }

  _getPageSelectedDoctor() {
    const selected = document.querySelector('.doc-radio-card.selected strong');
    return selected ? selected.textContent.trim() : 'Любой врач';
  }

  _getPageSelectedDate() {
    const display = document.getElementById('selected-date-display');
    return display ? display.textContent.trim() : '';
  }

  _getPageSelectedTime() {
    const selected = document.querySelector('.page-time-slot.selected');
    return selected ? selected.textContent.trim() : '';
  }
}

// ============================================================
// AUTO-INITIALIZE
// ============================================================
(function initAmoCRMIntegration() {
  // Determine if we're running on the local dev server or production
  const isLocalhost = typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  const amocrm = new AmoCRM({
    apiBase: '/api',
    debug:   isLocalhost,
  });

  // Expose globally for optional manual use
  window.AmoCRM = AmoCRM;
  window.amoCRM = amocrm;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      // Patch booking modal (available on all pages via script.js)
      amocrm.patchModalBooking();

      // Patch page booking form (booking.html only — safe to call on other pages, it checks for element)
      amocrm.patchPageBookingForm();

      // Attach WhatsApp click tracking
      amocrm.attachWhatsAppTracking();

      // Track page view (fire and forget — won't block if server is down)
      amocrm.trackPageView();
    });
  }
})();
