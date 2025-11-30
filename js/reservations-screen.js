// Reservations Screen Module
const ReservationsScreen = {
  currentDate: new Date(),
  reservations: [],
  serviceOfferings: [],
  loadingState: {
    serviceOfferings: false,
    reservations: false,
  },

  async init() {
    this.loadingState.serviceOfferings = true;
    this.loadingState.reservations = true;
    this.render();

    await this.loadServiceOfferings();
    this.loadingState.serviceOfferings = false;

    await this.loadReservations();
    this.loadingState.reservations = false;
    this.render();
  },

  async loadServiceOfferings() {
    try {
      const response = await fetch(
        `/.netlify/functions/get-service-offerings?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();
      if (data.success) {
        this.serviceOfferings = data.offerings || [];
      }
    } catch (error) {
      console.error('Failed to load service offerings:', error);
    }
  },

  async loadReservations() {
    try {
      const dateStr = this.currentDate.toISOString().split('T')[0];
      const response = await fetch(
        `/.netlify/functions/get-reservations?winery_id=${App.currentWinery.id}&date=${dateStr}`
      );
      const data = await response.json();
      if (data.success) {
        this.reservations = data.reservations || [];
      }
    } catch (error) {
      console.error('Failed to load reservations:', error);
      this.reservations = [];
    }
  },

  render() {
    const container = document.getElementById('reservationsContainer');
    if (!container) return;

    const dateStr = this.currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (this.loadingState.reservations) {
      container.innerHTML = `
        <div class="reservations-header">
          <div class="date-navigation">
            <button class="date-nav-btn" onclick="ReservationsScreen.previousDay()">←</button>
            <h3 class="current-date">${dateStr}</h3>
            <button class="date-nav-btn" onclick="ReservationsScreen.nextDay()">→</button>
          </div>
          <button class="add-reservation-btn" onclick="ReservationsScreen.showAddReservation()">
            ➕ Add Reservation
          </button>
        </div>
        <p style="text-align: center; color: #95a5a6; padding: 40px;">Loading reservations...</p>
      `;
      return;
    }

    container.innerHTML = `
      <div class="reservations-header">
        <div class="date-navigation">
          <button class="date-nav-btn" onclick="ReservationsScreen.previousDay()">←</button>
          <h3 class="current-date">${dateStr}</h3>
          <button class="date-nav-btn" onclick="ReservationsScreen.nextDay()">→</button>
        </div>
        <button class="add-reservation-btn" onclick="ReservationsScreen.showAddReservation()">
          ➕ Add Reservation
        </button>
      </div>

      <div class="reservations-summary">
        <div class="summary-card">
          <div class="summary-value">${this.reservations.length}</div>
          <div class="summary-label">Total Reservations</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${this.getTotalGuests()}</div>
          <div class="summary-label">Total Guests</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${this.getConfirmedCount()}</div>
          <div class="summary-label">Confirmed</div>
        </div>
      </div>

      <div class="reservations-list">
        ${this.renderReservationsList()}
      </div>
    `;
  },

  renderReservationsList() {
    if (this.reservations.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No reservations for this date</h3>
          <p>Click "Add Reservation" to create one</p>
        </div>
      `;
    }

    return this.reservations
      .map((res) => {
        const time = new Date(res.datetime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        const statusClass = this.getStatusClass(res.visit_status);
        const statusLabel = this.getStatusLabel(res.visit_status);

        return `
        <div class="reservation-card ${statusClass}" onclick="ReservationsScreen.viewReservation('${res.id}')">
          <div class="reservation-time">${time}</div>
          <div class="reservation-main">
            <div class="reservation-customer">
              <div class="customer-avatar">${this.getInitials(res.customer_name)}</div>
              <div class="customer-info">
                <div class="customer-name">${res.customer_name}</div>
                <div class="customer-email">${res.customer_email || ''}</div>
              </div>
            </div>
            <div class="reservation-details">
              <div class="detail-row">
                <span class="detail-label">Experience:</span>
                <span class="detail-value">${res.service_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Guests:</span>
                <span class="detail-value">${res.party_size}</span>
              </div>
              ${
                res.venue_name
                  ? `
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${res.venue_name}</span>
                </div>
              `
                  : ''
              }
            </div>
          </div>
          <div class="reservation-actions">
            <span class="status-badge status-${statusClass}">${statusLabel}</span>
            ${
              res.visit_status === 'expected'
                ? `
              <button class="check-in-btn" onclick="event.stopPropagation(); ReservationsScreen.checkIn('${res.id}')">
                Check In
              </button>
            `
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  },

  getStatusClass(status) {
    const statusMap = {
      expected: 'expected',
      arrived: 'arrived',
      seated: 'seated',
      completed: 'completed',
      no_show: 'no-show',
      cancelled: 'cancelled',
    };
    return statusMap[status] || 'expected';
  },

  getStatusLabel(status) {
    const labelMap = {
      expected: 'Expected',
      arrived: 'Arrived',
      seated: 'Seated',
      completed: 'Completed',
      no_show: 'No Show',
      cancelled: 'Cancelled',
    };
    return labelMap[status] || 'Expected';
  },

  getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  },

  getTotalGuests() {
    return this.reservations.reduce((sum, res) => sum + (res.party_size || 0), 0);
  },

  getConfirmedCount() {
    return this.reservations.filter(
      (res) => res.visit_status !== 'cancelled' && res.visit_status !== 'no_show'
    ).length;
  },

  previousDay() {
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.loadingState.reservations = true;
    this.render();
    this.loadReservations().then(() => {
      this.loadingState.reservations = false;
      this.render();
    });
  },

  nextDay() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.loadingState.reservations = true;
    this.render();
    this.loadReservations().then(() => {
      this.loadingState.reservations = false;
      this.render();
    });
  },

  showAddReservation() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content add-reservation-modal">
        <div class="modal-header">
          <h2>Add Reservation</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-section">
            <label class="form-label">Customer</label>
            <input type="text" 
              id="customerSearch" 
              class="form-input" 
              placeholder="Search customers..."
              oninput="ReservationsScreen.searchCustomers(this.value)">
            <div id="customerResults" class="customer-search-results"></div>
            <div id="selectedCustomer" class="selected-customer"></div>
          </div>

          <div class="form-section">
            <label class="form-label">Experience</label>
            <select id="experienceSelect" class="form-input">
              <option value="">Select experience...</option>
              ${this.serviceOfferings
                .map((offer) => {
                  const duration = offer.default_duration_minutes || 60;
                  const price = (offer.base_price_cents / 100).toFixed(2);
                  const pricingLabel = offer.pricing_per_person ? 'per person' : 'flat rate';
                  return `<option value="${offer.id}">${offer.name} (${duration}min - $${price} ${pricingLabel})</option>`;
                })
                .join('')}
            </select>
          </div>

          <div class="form-row">
            <div class="form-section">
              <label class="form-label">Date</label>
              <input type="date" 
                id="reservationDate" 
                class="form-input" 
                value="${this.currentDate.toISOString().split('T')[0]}">
            </div>
            <div class="form-section">
              <label class="form-label">Time</label>
              <input type="time" 
                id="reservationTime" 
                class="form-input">
            </div>
          </div>

          <div class="form-section">
            <label class="form-label">Number of Guests</label>
            <input type="number" 
              id="partySize" 
              class="form-input" 
              min="1" 
              value="2">
          </div>

          <div class="form-section">
            <label class="form-label">Notes (Optional)</label>
            <textarea id="reservationNotes" 
              class="form-input" 
              rows="3" 
              placeholder="Any special requests or notes..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn-primary" onclick="ReservationsScreen.saveReservation()">Create Reservation</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async searchCustomers(query) {
    if (!query || query.length < 2) {
      document.getElementById('customerResults').innerHTML = '';
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/search-customers?winery_id=${App.currentWinery.id}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      const resultsDiv = document.getElementById('customerResults');
      if (data.success && data.customers.length > 0) {
        resultsDiv.innerHTML = data.customers
          .map(
            (customer) => `
          <div class="customer-result" onclick="ReservationsScreen.selectCustomer('${customer.id}', '${customer.name}', '${customer.email || ''}')">
            <div class="customer-avatar">${this.getInitials(customer.name)}</div>
            <div class="customer-info">
              <div class="customer-name">${customer.name}</div>
              <div class="customer-email">${customer.email || ''}</div>
            </div>
          </div>
        `
          )
          .join('');
      } else {
        resultsDiv.innerHTML = '<div class="no-results">No customers found</div>';
      }
    } catch (error) {
      console.error('Failed to search customers:', error);
    }
  },

  selectCustomer(id, name, email) {
    document.getElementById('customerSearch').value = '';
    document.getElementById('customerResults').innerHTML = '';
    document.getElementById('selectedCustomer').innerHTML = `
      <div class="selected-customer-card">
        <div class="customer-avatar">${this.getInitials(name)}</div>
        <div class="customer-info">
          <div class="customer-name">${name}</div>
          <div class="customer-email">${email}</div>
        </div>
        <button class="remove-customer" onclick="ReservationsScreen.removeCustomer()">×</button>
      </div>
    `;
    document.getElementById('selectedCustomer').dataset.customerId = id;
  },

  removeCustomer() {
    document.getElementById('selectedCustomer').innerHTML = '';
    delete document.getElementById('selectedCustomer').dataset.customerId;
  },

  async saveReservation() {
    const customerId = document.getElementById('selectedCustomer').dataset.customerId;
    const serviceId = document.getElementById('experienceSelect').value;
    const date = document.getElementById('reservationDate').value;
    const time = document.getElementById('reservationTime').value;
    const partySize = document.getElementById('partySize').value;
    const notes = document.getElementById('reservationNotes').value;

    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    if (!serviceId) {
      alert('Please select an experience');
      return;
    }

    if (!date || !time) {
      alert('Please select date and time');
      return;
    }

    try {
      const datetime = `${date}T${time}:00`;
      const response = await fetch('/.netlify/functions/create-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winery_id: App.currentWinery.id,
          customer_id: customerId,
          service_id: serviceId,
          datetime: datetime,
          party_size: parseInt(partySize),
          notes: notes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        document.querySelector('.modal-overlay').remove();
        await this.loadReservations();
        this.render();
      } else {
        alert('Failed to create reservation: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create reservation:', error);
      alert('Failed to create reservation');
    }
  },

  async checkIn(reservationId) {
    const timeInput = prompt('Check-in time (leave empty for current time):');
    const checkInTime = timeInput || new Date().toISOString();

    try {
      const response = await fetch('/.netlify/functions/check-in-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          check_in_time: checkInTime,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await this.loadReservations();
        this.render();
      } else {
        alert('Failed to check in: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to check in:', error);
      alert('Failed to check in reservation');
    }
  },

  viewReservation(reservationId) {
    const reservation = this.reservations.find((r) => r.id === reservationId);
    if (!reservation) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content view-reservation-modal">
        <div class="modal-header">
          <h2>Reservation Details</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="reservation-summary-section">
            <div class="summary-item">
              <span class="summary-label">Customer:</span>
              <span class="summary-value">${reservation.customer_name}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Date & Time:</span>
              <span class="summary-value">${new Date(reservation.datetime).toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Experience:</span>
              <span class="summary-value">${reservation.service_name}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Party Size:</span>
              <span class="summary-value">${reservation.party_size} guests</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Status:</span>
              <span class="summary-value">
                <span class="status-badge status-${this.getStatusClass(reservation.visit_status)}">
                  ${this.getStatusLabel(reservation.visit_status)}
                </span>
              </span>
            </div>
            ${
              reservation.confirmation_code
                ? `
              <div class="summary-item">
                <span class="summary-label">Confirmation Code:</span>
                <span class="summary-value">${reservation.confirmation_code}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },
};
