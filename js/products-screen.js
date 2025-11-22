// Products Screen functionality
const ProductsScreen = {
  products: [],
  selectedProductIds: new Set(),

  async init() {
    await this.loadProducts();
    this.renderProducts();
  },

  async loadProducts() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-products?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success) {
        this.products = data.products;
        // Load selected products for this winery
        this.selectedProductIds = new Set(
          data.products.filter((p) => p.is_active_for_pos).map((p) => p.id)
        );
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  },

  renderProducts() {
    const container = document.getElementById('productsContainer');

    if (!container) return;

    if (this.products.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #95a5a6; padding: 40px;">No products available</p>';
      return;
    }

    const tableHtml = `
            <div style="margin-bottom: 20px;">
                <button class="btn" onclick="ProductsScreen.saveSelection()">Save POS Selection</button>
                <span style="margin-left: 15px; color: #95a5a6;">
                    ${this.selectedProductIds.size} of ${this.products.length} products selected for POS
                </span>
            </div>
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <th style="padding: 12px; text-align: center; color: #f39c12; width: 60px;">POS</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Wine Name</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Vintage</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Varietal</th>
                        <th style="padding: 12px; text-align: right; color: #f39c12;">Price</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.products
                      .map(
                        (p) => `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                            <td style="padding: 12px; text-align: center;">
                                <input type="checkbox" 
                                    ${this.selectedProductIds.has(p.id) ? 'checked' : ''} 
                                    onchange="ProductsScreen.toggleProduct(${p.id})"
                                    style="width: 18px; height: 18px; cursor: pointer;">
                            </td>
                            <td style="padding: 12px; color: #e8e8e8;">${p.name}</td>
                            <td style="padding: 12px; color: #95a5a6;">${p.vintage}</td>
                            <td style="padding: 12px; color: #95a5a6;">${p.varietal}</td>
                            <td style="padding: 12px; color: #f39c12; text-align: right;">$${parseFloat(p.price).toFixed(2)}</td>
                            <td style="padding: 12px; color: #95a5a6; font-size: 12px;">${p.description || ''}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        `;

    container.innerHTML = tableHtml;
  },

  toggleProduct(productId) {
    if (this.selectedProductIds.has(productId)) {
      this.selectedProductIds.delete(productId);
    } else {
      this.selectedProductIds.add(productId);
    }
    this.renderProducts();
  },

  async saveSelection() {
    try {
      const response = await fetch('/.netlify/functions/update-pos-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winery_id: App.currentWinery.id,
          product_ids: Array.from(this.selectedProductIds),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('POS product selection saved successfully!');
        // Reload POS products
        await POSScreen.loadProducts();
      } else {
        alert('Failed to save selection: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save selection:', error);
      alert('Failed to save selection');
    }
  },
};
