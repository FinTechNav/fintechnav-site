// Products Screen functionality - Enhanced with all product attributes
const ProductsScreen = {
  products: [],
  selectedProductIds: new Set(),
  editingProduct: null,
  showingDetails: false,
  searchTerm: '',
  filterType: 'all',
  filterStatus: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  loadingState: {
    products: false,
  },

  async init() {
    this.loadingState.products = true;
    this.renderProducts();

    await this.loadProducts();
    this.loadingState.products = false;
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
        this.selectedProductIds = new Set(
          data.products.filter((p) => p.is_active_for_pos).map((p) => p.id)
        );
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  },

  getFilteredAndSortedProducts() {
    let filtered = [...this.products];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.sku && p.sku.toLowerCase().includes(term)) ||
          (p.varietal && p.varietal.toLowerCase().includes(term)) ||
          (p.wine_region && p.wine_region.toLowerCase().includes(term))
      );
    }

    // Apply type filter
    if (this.filterType !== 'all') {
      filtered = filtered.filter((p) => p.type === this.filterType);
    }

    // Apply status filter
    if (this.filterStatus === 'active') {
      filtered = filtered.filter((p) => this.selectedProductIds.has(p.id));
    } else if (this.filterStatus === 'inactive') {
      filtered = filtered.filter((p) => !this.selectedProductIds.has(p.id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (this.sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'price':
          aVal = parseFloat(a.price || 0);
          bVal = parseFloat(b.price || 0);
          break;
        case 'stock':
          aVal = parseInt(a.available_quantity || 0);
          bVal = parseInt(b.available_quantity || 0);
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'vintage':
          aVal = parseInt(a.vintage || 0);
          bVal = parseInt(b.vintage || 0);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  },

  renderProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (this.loadingState.products) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    if (this.showingDetails && this.editingProduct) {
      container.innerHTML = this.renderProductDetails();
      return;
    }

    const products = this.getFilteredAndSortedProducts();

    const html = `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
          <input
            type="text"
            id="productSearch"
            placeholder="Search products..."
            value="${this.searchTerm}"
            onkeyup="ProductsScreen.handleSearch(event)"
            style="
              flex: 1;
              min-width: 200px;
              padding: 10px;
              background: #34495e;
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #ecf0f1;
              border-radius: 4px;
              font-family: Georgia, serif;
            "
          />

          <select
            id="filterType"
            onchange="ProductsScreen.handleFilterType(event)"
            style="
              padding: 10px;
              background: #34495e;
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #ecf0f1;
              border-radius: 4px;
              font-family: Georgia, serif;
            "
          >
            <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>All Types</option>
            <option value="wine" ${this.filterType === 'wine' ? 'selected' : ''}>Wine</option>
            <option value="merchandise" ${this.filterType === 'merchandise' ? 'selected' : ''}>Merchandise</option>
            <option value="experience" ${this.filterType === 'experience' ? 'selected' : ''}>Experience</option>
          </select>

          <select
            id="filterStatus"
            onchange="ProductsScreen.handleFilterStatus(event)"
            style="
              padding: 10px;
              background: #34495e;
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #ecf0f1;
              border-radius: 4px;
              font-family: Georgia, serif;
            "
          >
            <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>All Status</option>
            <option value="active" ${this.filterStatus === 'active' ? 'selected' : ''}>Active in POS</option>
            <option value="inactive" ${this.filterStatus === 'inactive' ? 'selected' : ''}>Inactive in POS</option>
          </select>

          <select
            id="sortBy"
            onchange="ProductsScreen.handleSort(event)"
            style="
              padding: 10px;
              background: #34495e;
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #ecf0f1;
              border-radius: 4px;
              font-family: Georgia, serif;
            "
          >
            <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
            <option value="price" ${this.sortBy === 'price' ? 'selected' : ''}>Sort by Price</option>
            <option value="stock" ${this.sortBy === 'stock' ? 'selected' : ''}>Sort by Stock</option>
            <option value="type" ${this.sortBy === 'type' ? 'selected' : ''}>Sort by Type</option>
            <option value="vintage" ${this.sortBy === 'vintage' ? 'selected' : ''}>Sort by Vintage</option>
          </select>

          <button
            onclick="ProductsScreen.toggleSortOrder()"
            style="
              padding: 10px 15px;
              background: #34495e;
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #ecf0f1;
              border-radius: 4px;
              cursor: pointer;
              font-family: Georgia, serif;
            "
          >
            ${this.sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          <button
            onclick="ProductsScreen.saveAllChanges()"
            style="
              padding: 10px 20px;
              background: linear-gradient(135deg, #27ae60, #229954);
              border: none;
              color: white;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
              font-family: Georgia, serif;
            "
          >
            Save Changes
          </button>
        </div>

        <p style="color: #95a5a6; font-size: 14px; margin-bottom: 10px;">
          Showing ${products.length} of ${this.products.length} products
          ${this.selectedProductIds.size > 0 ? `(${this.selectedProductIds.size} active in POS)` : ''}
        </p>
      </div>

      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 15px;
      ">
        ${products.length === 0 ? '<p style="color: #95a5a6; text-align: center; grid-column: 1 / -1;">No products found</p>' : products.map((p) => this.renderProductCard(p)).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  renderLoadingState() {
    return `
      <div style="padding: 20px;">
        <!-- Filters skeleton -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          ${Array(5)
            .fill(0)
            .map(
              () => `
            <div style="
              height: 40px;
              width: 150px;
              background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              border-radius: 4px;
            "></div>
          `
            )
            .join('')}
        </div>

        <!-- Product cards skeleton -->
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
        ">
          ${Array(12)
            .fill(0)
            .map(
              () => `
            <div style="
              background: #34495e;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            ">
              <!-- Checkbox skeleton -->
              <div style="
                width: 20px;
                height: 20px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 10px;
              "></div>

              <!-- Name skeleton -->
              <div style="
                height: 20px;
                width: 80%;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 8px;
              "></div>

              <!-- Info skeleton -->
              <div style="
                height: 14px;
                width: 60%;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 8px;
              "></div>

              <!-- Price skeleton -->
              <div style="
                height: 18px;
                width: 40%;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
                margin-top: 10px;
              "></div>
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

  renderProductCard(product) {
    const isSelected = this.selectedProductIds.has(product.id);
    const displayPrice = product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'N/A';
    const displayType = product.type || 'Unknown';
    const displayStock = product.available_quantity !== null ? product.available_quantity : 'N/A';

    // Wine-specific details
    const wineDetails =
      product.type === 'wine'
        ? [product.vintage ? `${product.vintage}` : null, product.varietal, product.wine_region]
            .filter(Boolean)
            .join(' • ')
        : '';

    return `
      <div style="
        background: #34495e;
        padding: 15px;
        border-radius: 8px;
        border: 2px solid ${isSelected ? '#27ae60' : 'rgba(255, 255, 255, 0.1)'};
        transition: all 0.2s;
        cursor: pointer;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
            <input
              type="checkbox"
              ${isSelected ? 'checked' : ''}
              onchange="ProductsScreen.toggleProduct('${product.id}')"
              style="width: 18px; height: 18px; cursor: pointer;"
            />
            <span style="color: #ecf0f1; font-weight: 600; font-size: 15px; font-family: Georgia, serif;">
              ${product.name}
            </span>
          </label>
          <button
            onclick="ProductsScreen.showProductDetails('${product.id}')"
            style="
              background: transparent;
              border: none;
              color: #3498db;
              cursor: pointer;
              font-size: 18px;
              padding: 0;
              margin-left: 10px;
            "
            title="View details"
          >ℹ️</button>
        </div>

        ${product.sku ? `<p style="color: #95a5a6; font-size: 12px; margin-bottom: 5px;">SKU: ${product.sku}</p>` : ''}
        
        ${wineDetails ? `<p style="color: #95a5a6; font-size: 13px; margin-bottom: 5px;">${wineDetails}</p>` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <span style="color: #f39c12; font-weight: 600; font-size: 16px; font-family: Georgia, serif;">
            ${displayPrice}
          </span>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="
              padding: 3px 8px;
              background: rgba(52, 152, 219, 0.2);
              color: #3498db;
              border-radius: 10px;
              font-size: 11px;
              text-transform: uppercase;
            ">${displayType}</span>
            <span style="color: #95a5a6; font-size: 12px;">Stock: ${displayStock}</span>
          </div>
        </div>
      </div>
    `;
  },

  // Continue with rest of methods...
  renderProductDetails() {
    // Existing product details code...
    return '';
  },

  handleSearch(event) {
    this.searchTerm = event.target.value;
    this.renderProducts();
  },

  handleFilterType(event) {
    this.filterType = event.target.value;
    this.renderProducts();
  },

  handleFilterStatus(event) {
    this.filterStatus = event.target.value;
    this.renderProducts();
  },

  handleSort(event) {
    this.sortBy = event.target.value;
    this.renderProducts();
  },

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.renderProducts();
  },

  toggleProduct(productId) {
    if (this.selectedProductIds.has(productId)) {
      this.selectedProductIds.delete(productId);
    } else {
      this.selectedProductIds.add(productId);
    }
    this.renderProducts();
  },

  showProductDetails(productId) {
    this.editingProduct = this.products.find((p) => p.id === productId);
    this.showingDetails = true;
    this.renderProducts();
  },

  closeProductDetails() {
    this.editingProduct = null;
    this.showingDetails = false;
    this.renderProducts();
  },

  async saveAllChanges() {
    if (!App.currentWinery) return;

    const updates = Array.from(this.selectedProductIds).map((id) => ({
      product_id: id,
      is_active_for_pos: true,
    }));

    const deactivations = this.products
      .filter((p) => !this.selectedProductIds.has(p.id))
      .map((p) => ({
        product_id: p.id,
        is_active_for_pos: false,
      }));

    const allUpdates = [...updates, ...deactivations];

    try {
      const response = await fetch('/.netlify/functions/update-pos-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winery_id: App.currentWinery.id,
          updates: allUpdates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Product settings saved successfully');
        await this.loadProducts();
        this.renderProducts();

        if (window.POSScreen && typeof POSScreen.loadProducts === 'function') {
          await POSScreen.loadProducts();
          POSScreen.renderProductSelector();
        }
      } else {
        alert('Failed to save changes: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  },
};
