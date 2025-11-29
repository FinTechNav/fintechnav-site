// Google Maps Helper - Using AdvancedMarkerElement (new API)
// Add this to customers-screen.js when implementing map view

const GoogleMapsHelper = {
  map: null,
  markers: [],
  drawingManager: null,
  currentPolygon: null,

  /**
   * Wait for Google Maps API to be loaded
   */
  async waitForGoogleMaps() {
    return new Promise((resolve) => {
      if (window.google && window.google.maps) {
        resolve();
      } else {
        window.addEventListener('googleMapsReady', resolve, { once: true });
      }
    });
  },

  /**
   * Initialize the map
   */
  async initMap(containerId, center = { lat: 38.5, lng: -120.5 }) {
    await this.waitForGoogleMaps();

    this.map = new google.maps.Map(document.getElementById(containerId), {
      zoom: 6,
      center: center,
      mapId: 'HEAVY_POUR_CUSTOMER_MAP', // Required for AdvancedMarkerElement
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Initialize drawing manager for polygon filtering
    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#FF6B35',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#FF6B35',
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    this.drawingManager.setMap(this.map);

    // Listen for polygon completion
    google.maps.event.addListener(this.drawingManager, 'polygoncomplete', (polygon) => {
      this.handlePolygonComplete(polygon);
    });
  },

  /**
   * Create a customer marker using AdvancedMarkerElement (new API)
   */
  async createCustomerMarker(customer) {
    if (!customer.latitude || !customer.longitude) {
      return null;
    }

    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

    // Create custom pin with orange color
    const pinElement = new PinElement({
      background: '#FF6B35',
      borderColor: '#D65A2E',
      glyphColor: '#FFFFFF',
    });

    // Create advanced marker
    const marker = new AdvancedMarkerElement({
      map: this.map,
      position: { lat: customer.latitude, lng: customer.longitude },
      title: `${customer.first_name} ${customer.last_name}`,
      content: pinElement.element,
    });

    // Add click listener for customer details
    marker.addListener('click', () => {
      this.showCustomerInfoWindow(customer, marker);
    });

    return marker;
  },

  /**
   * Show info window for customer (compatible with AdvancedMarkerElement)
   */
  showCustomerInfoWindow(customer, marker) {
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">
            ${customer.first_name} ${customer.last_name}
          </h3>
          <p style="margin: 4px 0; color: #666; font-size: 13px;">
            ${customer.email}
          </p>
          ${customer.phone ? `<p style="margin: 4px 0; color: #666; font-size: 13px;">${customer.phone}</p>` : ''}
          <p style="margin: 4px 0; color: #666; font-size: 13px;">
            ${customer.city ? `${customer.city}, ${customer.state_code || customer.province || ''}` : 'Location not specified'}
          </p>
          ${customer.customer_status === 'vip' ? '<span style="background: #FFD700; color: #333; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">VIP</span>' : ''}
          ${customer.club_member_status === 'active' ? '<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-left: 4px;">Club</span>' : ''}
        </div>
      `,
    });

    infoWindow.open({
      anchor: marker,
      map: this.map,
    });
  },

  /**
   * Add multiple customer markers to map
   */
  async addCustomerMarkers(customers) {
    // Clear existing markers
    this.clearMarkers();

    // Filter customers with valid coordinates
    const geocodedCustomers = customers.filter((c) => c.latitude && c.longitude);

    console.log(`Adding ${geocodedCustomers.length} customer markers to map`);

    // Create markers for all geocoded customers
    const markerPromises = geocodedCustomers.map((customer) => this.createCustomerMarker(customer));

    this.markers = (await Promise.all(markerPromises)).filter((m) => m !== null);

    // Fit map bounds to show all markers
    if (this.markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach((marker) => {
        bounds.extend(marker.position);
      });
      this.map.fitBounds(bounds);
    }
  },

  /**
   * Clear all markers from map
   */
  clearMarkers() {
    this.markers.forEach((marker) => {
      marker.map = null; // Remove from map
    });
    this.markers = [];
  },

  /**
   * Enable polygon drawing mode
   */
  enableDrawing() {
    this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  },

  /**
   * Disable polygon drawing mode
   */
  disableDrawing() {
    this.drawingManager.setDrawingMode(null);
  },

  /**
   * Handle polygon completion
   */
  handlePolygonComplete(polygon) {
    // Remove previous polygon if exists
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
    }

    this.currentPolygon = polygon;
    this.disableDrawing();

    // Filter customers by polygon
    this.filterCustomersByPolygon();

    // Listen for polygon edits
    google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
      this.filterCustomersByPolygon();
    });
    google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
      this.filterCustomersByPolygon();
    });
  },

  /**
   * Filter customers by polygon boundary
   */
  filterCustomersByPolygon() {
    if (!this.currentPolygon) return;

    const path = this.currentPolygon.getPath();
    const customersInPolygon = [];

    // Check each marker
    this.markers.forEach((marker, index) => {
      const inPolygon = google.maps.geometry.poly.containsLocation(
        marker.position,
        this.currentPolygon
      );

      if (inPolygon) {
        customersInPolygon.push(index);
      }
    });

    console.log(`${customersInPolygon.length} customers inside polygon`);

    // Trigger callback to parent screen
    if (this.onPolygonFilter) {
      this.onPolygonFilter(customersInPolygon);
    }
  },

  /**
   * Remove current polygon
   */
  removePolygon() {
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
      this.currentPolygon = null;

      // Reset filter
      if (this.onPolygonFilter) {
        this.onPolygonFilter(null);
      }
    }
  },

  /**
   * Destroy map and cleanup
   */
  destroy() {
    this.clearMarkers();
    this.removePolygon();
    if (this.drawingManager) {
      this.drawingManager.setMap(null);
    }
    this.map = null;
  },
};

// Export for use in customers-screen.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleMapsHelper;
}
