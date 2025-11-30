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
      container.innerHTML =
        '<p style="text-align: center; color: #95a5a6; padding: 40px;">Loading products...</p>';
      return;
    }

    const filtered = this.getFilteredAndSortedProducts();

    if (this.products.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #95a5a6; padding: 40px;">No products available</p>';
      return;
    }

    const tableHtml = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
                    <input type="text" 
                        placeholder="Search products..." 
                        value="${this.searchTerm}"
                        oninput="ProductsScreen.handleSearch(this.value)"
                        style="flex: 1; min-width: 250px; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #e8e8e8;">
                    
                    <select onchange="ProductsScreen.handleFilterType(this.value)" 
                        style="padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #e8e8e8;">
                        <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>All Types</option>
                        <option value="wine" ${this.filterType === 'wine' ? 'selected' : ''}>Wine Only</option>
                        <option value="merchandise" ${this.filterType === 'merchandise' ? 'selected' : ''}>Merchandise Only</option>
                    </select>
                    
                    <select onchange="ProductsScreen.handleFilterStatus(this.value)" 
                        style="padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #e8e8e8;">
                        <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>All Products</option>
                        <option value="active" ${this.filterStatus === 'active' ? 'selected' : ''}>Active for POS</option>
                        <option value="inactive" ${this.filterStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                    
                    <select onchange="ProductsScreen.handleSort(this.value)" 
                        style="padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #e8e8e8;">
                        <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
                        <option value="price" ${this.sortBy === 'price' ? 'selected' : ''}>Sort by Price</option>
                        <option value="stock" ${this.sortBy === 'stock' ? 'selected' : ''}>Sort by Stock</option>
                        <option value="type" ${this.sortBy === 'type' ? 'selected' : ''}>Sort by Type</option>
                        <option value="vintage" ${this.sortBy === 'vintage' ? 'selected' : ''}>Sort by Vintage</option>
                    </select>
                    
                    <button onclick="ProductsScreen.toggleSortOrder()" 
                        style="padding: 10px 15px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #e8e8e8; cursor: pointer;">
                        ${this.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                    </button>
                </div>
                
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn" onclick="ProductsScreen.saveSelection()">Save POS Selection</button>
                    <button class="btn" onclick="ProductsScreen.showAddProduct()" style="background: #27ae60;">Add New Product</button>
                    <span style="margin-left: 15px; color: #95a5a6;">
                        Showing ${filtered.length} of ${this.products.length} products | ${this.selectedProductIds.size} active for POS
                    </span>
                </div>
            </div>
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <th style="padding: 12px; text-align: center; color: #f39c12; width: 60px;">POS</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Product Name</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Vintage</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Varietal</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Type</th>
                        <th style="padding: 12px; text-align: right; color: #f39c12;">Price</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12;">Stock</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12;">Status</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12; width: 120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      filtered.length === 0
                        ? '<tr><td colspan="9" style="padding: 40px; text-align: center; color: #95a5a6;">No products match your filters</td></tr>'
                        : filtered
                            .map(
                              (p) => `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                            <td style="padding: 12px; text-align: center;">
                                <input type="checkbox" 
                                    ${this.selectedProductIds.has(p.id) ? 'checked' : ''}
                                    onchange="ProductsScreen.toggleProduct(${p.id})"
                                    style="cursor: pointer; width: 18px; height: 18px;">
                            </td>
                            <td style="padding: 12px; color: #e8e8e8;">
                                ${p.name}
                                ${p.image_url ? '🖼️' : ''}
                            </td>
                            <td style="padding: 12px; color: #95a5a6;">${p.vintage || '-'}</td>
                            <td style="padding: 12px; color: #95a5a6;">${p.varietal || '-'}</td>
                            <td style="padding: 12px; color: #95a5a6;">
                                <span style="background: ${this.getTypeColor(p.wine_color || p.product_category || p.type)}; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">
                                    ${p.wine_color || p.product_category || p.type || 'Product'}
                                </span>
                            </td>
                            <td style="padding: 12px; text-align: right; color: #f39c12; font-weight: 600;">
                                $${parseFloat(p.price || 0).toFixed(2)}
                            </td>
                            <td style="padding: 12px; text-align: center; color: ${p.available_quantity > p.reorder_point ? '#27ae60' : '#e74c3c'};">
                                ${p.track_inventory ? p.available_quantity || 0 : '∞'}
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <span style="color: ${p.online_status === 'available' ? '#27ae60' : '#e74c3c'};">
                                    ${p.online_status || 'available'}
                                </span>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <button onclick="ProductsScreen.viewDetails(${p.id})" 
                                    style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;"
                                    title="View Details">👁️</button>
                                <button onclick="ProductsScreen.editProduct(${p.id})" 
                                    style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;"
                                    title="Edit">✏️</button>
                                <button onclick="ProductsScreen.deleteProduct(${p.id})" 
                                    style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
                                    title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `
                            )
                            .join('')
                    }
                </tbody>
            </table>
        `;

    container.innerHTML = tableHtml;

    // Render table separately so search input keeps focus
    this.renderProductsTable();
  },

  renderProductsTable() {
    // Find the table tbody or re-render just the table portion
    const container = document.getElementById('productsContainer');
    if (!container) return;

    const filtered = this.getFilteredAndSortedProducts();

    // Find existing table or create table HTML
    let table = container.querySelector('table.data-table');
    if (!table) {
      // First render - create full table structure
      const tableHtml = `
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <th style="padding: 12px; text-align: center; color: #f39c12; width: 60px;">POS</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Product Name</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Vintage</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Varietal</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Type</th>
                        <th style="padding: 12px; text-align: right; color: #f39c12;">Price</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12;">Stock</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12;">Status</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12; width: 120px;">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
      container.insertAdjacentHTML('beforeend', tableHtml);
      table = container.querySelector('table.data-table');
    }

    const tbody = table.querySelector('tbody');
    tbody.innerHTML =
      filtered.length === 0
        ? '<tr><td colspan="9" style="padding: 40px; text-align: center; color: #95a5a6;">No products match your filters</td></tr>'
        : filtered
            .map(
              (p) => `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <td style="padding: 12px; text-align: center;">
                  <input type="checkbox" 
                      ${this.selectedProductIds.has(p.id) ? 'checked' : ''}
                      onchange="ProductsScreen.toggleProduct(${p.id})"
                      style="cursor: pointer; width: 18px; height: 18px;">
              </td>
              <td style="padding: 12px; color: #e8e8e8;">
                  ${p.name}
                  ${p.image_url ? '🖼️' : ''}
              </td>
              <td style="padding: 12px; color: #95a5a6;">${p.vintage || '-'}</td>
              <td style="padding: 12px; color: #95a5a6;">${p.varietal || '-'}</td>
              <td style="padding: 12px; color: #95a5a6;">
                  <span style="background: ${this.getTypeColor(p.wine_color || p.product_category || p.type)}; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">
                      ${p.wine_color || p.product_category || p.type || 'Product'}
                  </span>
              </td>
              <td style="padding: 12px; text-align: right; color: #f39c12; font-weight: 600;">
                  $${parseFloat(p.price || 0).toFixed(2)}
              </td>
              <td style="padding: 12px; text-align: center; color: ${p.available_quantity > p.reorder_point ? '#27ae60' : '#e74c3c'};">
                  ${p.track_inventory ? p.available_quantity || 0 : '∞'}
              </td>
              <td style="padding: 12px; text-align: center;">
                  <span style="color: ${p.online_status === 'available' ? '#27ae60' : '#e74c3c'};">
                      ${p.online_status || 'available'}
                  </span>
              </td>
              <td style="padding: 12px; text-align: center;">
                  <button onclick="ProductsScreen.viewDetails(${p.id})" 
                      style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;"
                      title="View Details">👁️</button>
                  <button onclick="ProductsScreen.editProduct(${p.id})" 
                      style="background: #f39c12; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;"
                      title="Edit">✏️</button>
                  <button onclick="ProductsScreen.deleteProduct(${p.id})" 
                      style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
                      title="Delete">🗑️</button>
              </td>
          </tr>
        `
            )
            .join('');

    // Update the count display
    const countDisplay = container.querySelector('span[style*="margin-left: 15px"]');
    if (countDisplay) {
      countDisplay.textContent = `Showing ${filtered.length} of ${this.products.length} products | ${this.selectedProductIds.size} active for POS`;
    }
  },

  handleSearch(value) {
    this.searchTerm = value;
    this.renderProductsTable(); // Only re-render table, not inputs
  },

  handleFilterType(value) {
    this.filterType = value;
    this.renderProductsTable();
  },

  handleFilterStatus(value) {
    this.filterStatus = value;
    this.renderProductsTable();
  },

  handleSort(value) {
    this.sortBy = value;
    this.renderProductsTable();
  },

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.renderProductsTable();
  },

  getTypeColor(wineColor) {
    const colors = {
      Red: 'rgba(139, 0, 0, 0.6)',
      White: 'rgba(218, 165, 32, 0.6)',
      Rosé: 'rgba(255, 192, 203, 0.6)',
      Sparkling: 'rgba(255, 215, 0, 0.6)',
      Fortified: 'rgba(139, 69, 19, 0.6)',
      Dessert: 'rgba(184, 134, 11, 0.6)',
      Stemware: 'rgba(70, 130, 180, 0.6)',
      Decanter: 'rgba(72, 61, 139, 0.6)',
      Provisions: 'rgba(107, 142, 35, 0.6)',
      Accessories: 'rgba(105, 105, 105, 0.6)',
      merchandise: 'rgba(128, 128, 128, 0.6)',
    };
    return colors[wineColor] || 'rgba(128, 128, 128, 0.6)';
  },

  toggleProduct(productId) {
    if (this.selectedProductIds.has(productId)) {
      this.selectedProductIds.delete(productId);
    } else {
      this.selectedProductIds.add(productId);
    }
  },

  async saveSelection() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch('/.netlify/functions/update-pos-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winery_id: App.currentWinery.id,
          product_ids: Array.from(this.selectedProductIds),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `✅ POS selection updated!\n${this.selectedProductIds.size} products active for POS.`
        );
      } else {
        alert('Failed to update POS selection: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save selection:', error);
      alert('Failed to save POS selection');
    }
  },

  viewDetails(productId) {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return;

    const isWine = product.type === 'wine';
    const isMerchandise = product.type === 'merchandise';

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="background: #2c3e50; padding: 30px; border-radius: 12px; max-width: 800px; max-height: 80vh; overflow-y: auto; color: #e8e8e8;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #f39c12; margin: 0;">${isWine ? 'Wine' : 'Product'} Details</h2>
          <button onclick="this.closest('div[style*=fixed]').remove()" 
            style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <h3 style="color: #f39c12; margin-top: 0;">Basic Information</h3>
            <p><strong>Name:</strong> ${product.name}</p>
            <p><strong>SKU:</strong> ${product.sku || 'N/A'}</p>
            <p><strong>Barcode:</strong> ${product.barcode || 'N/A'}</p>
            <p><strong>Type:</strong> ${product.type || 'product'}</p>
            ${
              isWine
                ? `
              <p><strong>Wine Color:</strong> ${product.wine_color || 'N/A'}</p>
              <p><strong>Vintage:</strong> ${product.vintage || 'N/A'}</p>
              <p><strong>Varietal:</strong> ${product.varietal || 'N/A'}</p>
            `
                : ''
            }
            ${
              isMerchandise
                ? `
              <p><strong>Category:</strong> ${product.product_category || product.category || 'N/A'}</p>
              <p><strong>Material:</strong> ${product.material || 'N/A'}</p>
              <p><strong>Dimensions:</strong> ${product.dimensions || 'N/A'}</p>
              <p><strong>Manufacturer:</strong> ${product.manufacturer || 'N/A'}</p>
            `
                : ''
            }
          </div>
          
          <div>
            <h3 style="color: #f39c12; margin-top: 0;">Pricing & Inventory</h3>
            <p><strong>Retail Price:</strong> $${parseFloat(product.price || 0).toFixed(2)}</p>
            <p><strong>Original Price:</strong> ${product.original_price ? '$' + parseFloat(product.original_price).toFixed(2) : 'N/A'}</p>
            <p><strong>Supply Price:</strong> ${product.supply_price ? '$' + parseFloat(product.supply_price).toFixed(2) : 'N/A'}</p>
            <p><strong>COGS:</strong> ${product.cogs ? '$' + parseFloat(product.cogs).toFixed(2) : 'N/A'}</p>
            <p><strong>Available:</strong> ${product.track_inventory ? product.available_quantity || 0 : 'Unlimited'}</p>
            <p><strong>Reorder Point:</strong> ${product.reorder_point || 0}</p>
          </div>
          
          ${
            isWine
              ? `
          <div>
            <h3 style="color: #f39c12;">Wine Characteristics</h3>
            <p><strong>Region:</strong> ${product.wine_region || 'N/A'}</p>
            <p><strong>Appellation:</strong> ${product.appellation || 'N/A'}</p>
            <p><strong>Country:</strong> ${product.origin_country || 'N/A'}</p>
            <p><strong>Body:</strong> ${product.body_weight || 'N/A'}</p>
            <p><strong>Sweetness:</strong> ${product.sweetness_level || 'N/A'}</p>
            <p><strong>Acidity:</strong> ${product.acidity_level || 'N/A'}</p>
            <p><strong>Tannins:</strong> ${product.tannin_level || 'N/A'}</p>
            <p><strong>Fruit Intensity:</strong> ${product.fruit_intensity || 'N/A'}</p>
            <p><strong>Bottle Size:</strong> ${product.bottle_volume || 750}ml</p>
          </div>
          `
              : ''
          }
          
          <div>
            <h3 style="color: #f39c12;">Status & Settings</h3>
            <p><strong>Online Status:</strong> ${product.online_status || 'available'}</p>
            <p><strong>Inventory Status:</strong> ${product.inventory_status || 'available'}</p>
            <p><strong>Visibility:</strong> ${product.visibility || 'public'}</p>
            <p><strong>Track Inventory:</strong> ${product.track_inventory ? 'Yes' : 'No'}</p>
            <p><strong>Ships Direct:</strong> ${product.ships_direct ? 'Yes' : 'No'}</p>
            <p><strong>Backorder Policy:</strong> ${product.backorder_policy || 'allow'}</p>
            <p><strong>Tax Category:</strong> ${product.tax_category || 'wine'}</p>
          </div>
        </div>
        
        ${product.short_description ? `<div style="margin-top: 20px;"><h3 style="color: #f39c12;">Description</h3><p>${product.short_description}</p></div>` : ''}
        ${product.tags && product.tags.length > 0 ? `<div style="margin-top: 20px;"><h3 style="color: #f39c12;">Tags</h3><p>${product.tags.join(', ')}</p></div>` : ''}
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.9em; color: #95a5a6;">
          <p><strong>Version:</strong> ${product.version || 1}</p>
          <p><strong>Created:</strong> ${product.created_at ? new Date(product.created_at).toLocaleString() : 'N/A'}</p>
          <p><strong>Updated:</strong> ${product.updated_at ? new Date(product.updated_at).toLocaleString() : 'N/A'}</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  editProduct(productId) {
    alert('Edit product feature coming soon. Product ID: ' + productId);
    // TODO: Implement edit form with all fields
  },

  showAddProduct() {
    alert('Add new product feature coming soon.');
    // TODO: Implement add product form with all fields
  },

  async deleteProduct(productId) {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return;

    if (
      !confirm(
        `Are you sure you want to delete "${product.name}"?\n\nThis will soft-delete the product.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/delete-product?product_id=${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Product deleted successfully');
        await this.loadProducts();
        this.renderProducts();
      } else {
        alert('Failed to delete product: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  },
};
