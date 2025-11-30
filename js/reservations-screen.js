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
    this.render();

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

      ${
        this.loadingState.reservations
          ? this.renderLoadingState()
          : `
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
      `
      }
    `;
  },

  renderLoadingState() {
    return `
      <div style="padding: 20px;">
        <!-- Summary cards skeleton -->
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        ">
          ${Array(3)
            .fill(0)
            .map(
              () => `
            <div style="
              background: #34495e;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
            ">
              <div style="
                height: 40px;
                width: 60px;
                margin: 0 auto 10px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 14px;
                width: 100px;
                margin: 0 auto;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
            </div>
          `
            )
            .join('')}
        </div>

        <!-- Reservation list skeleton -->
        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${Array(6)
            .fill(0)
            .map(
              () => `
            <div style="
              background: #34495e;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid rgba(255,255,255,0.1);
            ">
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="flex: 1;">
                  <div style="
                    height: 20px;
                    width: 80px;
                    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 4px;
                    margin-bottom: 8px;
                  "></div>
                  <div style="
                    height: 16px;
                    width: 150px;
                    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 4px;
                  "></div>
                </div>
                <div style="
                  height: 24px;
                  width: 80px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 12px;
                "></div>
              </div>
              <div style="display: flex; gap: 20px;">
                <div style="
                  height: 14px;
                  width: 120px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
                <div style="
                  height: 14px;
                  width: 100px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <style>
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        </style>
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
        });
        const statusColors = {
          confirmed: '#2ecc71',
          pending: '#f39c12',
          cancelled: '#e74c3c',
          completed: '#95a5a6',
        };

        return `
          <div class="reservation-card" style="border-left-color: ${statusColors[res.status] || '#95a5a6'};">
            <div class="reservation-header">
              <div class="reservation-time-info">
                <div class="reservation-time">${time}</div>
                <div class="reservation-name">${res.customer_name}</div>
              </div>
              <span class="reservation-status status-${res.status}">${res.status}</span>
            </div>
            <div class="reservation-details">
              <span>👥 ${res.party_size} guests</span>
              <span>${res.service_name || 'Tasting'}</span>
              ${res.notes ? `<span>📝 ${res.notes}</span>` : ''}
            </div>
          </div>
        `;
      })
      .join('');
  },

  getTotalGuests() {
    return this.reservations.reduce((sum, res) => sum + (res.party_size || 0), 0);
  },

  getConfirmedCount() {
    return this.reservations.filter((res) => res.status === 'confirmed').length;
  },

  async previousDay() {
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.loadingState.reservations = true;
    this.render();
    await this.loadReservations();
    this.loadingState.reservations = false;
    this.render();
  },

  async nextDay() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.loadingState.reservations = true;
    this.render();
    await this.loadReservations();
    this.loadingState.reservations = false;
    this.render();
  },

  showAddReservation() {
    alert('Add reservation modal coming soon');
  },
};
