// Products page functionality
class ProductsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.filters = {
            search: '',
            category: '',
            brand: '',
            minPrice: '',
            maxPrice: '',
            sort: '-createdAt'
        };
        this.categories = [];
        this.brands = [];
    }

    // Load filters (categories and brands) from backend
    async loadFilters() {
        try {
            // Show loading state for filters
            this.showFilterLoadingState();

            // Load categories and brands from their respective endpoints
            const [categoriesResponse, brandsResponse] = await Promise.all([
                api.getCategories(),
                api.getBrands()
            ]);

            if (categoriesResponse.data && brandsResponse.data) {
                this.categories = categoriesResponse.data.categories || [];
                this.brands = brandsResponse.data.brands || [];
                
                this.displayCategories(this.categories);
                this.displayBrands(this.brands);
            } else {
                this.showFilterErrorState();
            }

        } catch (error) {
            console.error('Error loading filters:', error);
            this.showFilterErrorState();
            // Fallback: try to extract from products
            await this.loadFiltersFromProducts();
        }
    }

    // Fallback method to load filters from products
    async loadFiltersFromProducts() {
        try {
            const response = await api.getProducts({ limit: 100 });
            if (response.data && response.data.products) {
                const categories = [...new Set(response.data.products.map(p => p.category?.name).filter(Boolean))];
                const brands = [...new Set(response.data.products.map(p => p.brand?.name).filter(Boolean))];
                
                this.displayCategories(categories);
                this.displayBrands(brands);
            }
        } catch (error) {
            console.error('Error loading filters from products:', error);
        }
    }

    // Display categories in filter
    displayCategories(categories) {
        const container = document.getElementById('categories-list');
        if (!categories || categories.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm">No categories available</div>';
            return;
        }

        container.innerHTML = categories.map(category => {
            const categoryName = category.name || category;
            const categoryId = category._id || category;
            return `
                <label class="flex items-center space-x-2 cursor-pointer group">
                    <input type="checkbox" value="${categoryId}" class="filter-checkbox category-filter hidden">
                    <div class="w-4 h-4 border border-gray-600 flex items-center justify-center group-hover:border-neon transition duration-300">
                        <i class="fas fa-check text-white text-xs hidden"></i>
                    </div>
                    <span class="text-sm tracking-wider uppercase group-hover:text-neon transition duration-300">${categoryName}</span>
                </label>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.category-filter').forEach(checkbox => {
            checkbox.addEventListener('change', this.handleFilterChange.bind(this));
        });
    }

    // Display brands in filter
    displayBrands(brands) {
        const container = document.getElementById('brands-list');
        if (!brands || brands.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm">No brands available</div>';
            return;
        }

        container.innerHTML = brands.map(brand => {
            const brandName = brand.name || brand;
            const brandId = brand._id || brand;
            return `
                <label class="flex items-center space-x-2 cursor-pointer group">
                    <input type="checkbox" value="${brandId}" class="filter-checkbox brand-filter hidden">
                    <div class="w-4 h-4 border border-gray-600 flex items-center justify-center group-hover:border-neon transition duration-300">
                        <i class="fas fa-check text-white text-xs hidden"></i>
                    </div>
                    <span class="text-sm tracking-wider uppercase group-hover:text-neon transition duration-300">${brandName}</span>
                </label>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.brand-filter').forEach(checkbox => {
            checkbox.addEventListener('change', this.handleFilterChange.bind(this));
        });
    }

    // Handle filter changes
    handleFilterChange() {
        this.updateSelectedFilters();
    }

    // Update selected filters
    updateSelectedFilters() {
        // Update category
        const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked'))
            .map(cb => cb.value);
        this.filters.category = selectedCategories.length > 0 ? selectedCategories[0] : '';

        // Update brand
        const selectedBrands = Array.from(document.querySelectorAll('.brand-filter:checked'))
            .map(cb => cb.value);
        this.filters.brand = selectedBrands.length > 0 ? selectedBrands[0] : '';

        // Update search
        this.filters.search = document.getElementById('filter-search').value;

        // Update price range
        this.filters.minPrice = document.getElementById('min-price').value;
        this.filters.maxPrice = document.getElementById('max-price').value;

        // Update sort
        this.filters.sort = document.getElementById('sort-option').value;

        // Update visual checkboxes
        this.updateCheckboxVisuals();
    }

    // Update checkbox visuals
    updateCheckboxVisuals() {
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            const container = checkbox.parentElement;
            const checkIcon = container.querySelector('.fa-check');
            if (checkbox.checked) {
                container.querySelector('div').classList.add('bg-neon', 'border-neon');
                checkIcon.classList.remove('hidden');
            } else {
                container.querySelector('div').classList.remove('bg-neon', 'border-neon');
                checkIcon.classList.add('hidden');
            }
        });
    }

    // Load products with current filters
    async loadProducts(page = 1) {
        this.currentPage = page;
        
        try {
            // Show loading state
            this.showLoadingState();

            // Build query parameters
            const queryParams = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.filters.sort
            };

            if (this.filters.search) queryParams.search = this.filters.search;
            if (this.filters.category) queryParams.category = this.filters.category;
            if (this.filters.brand) queryParams.brand = this.filters.brand;
            if (this.filters.minPrice) queryParams.minPrice = this.filters.minPrice;
            if (this.filters.maxPrice) queryParams.maxPrice = this.filters.maxPrice;

            const response = await api.getProducts(queryParams);
            
            if (response.data && response.data.products) {
                this.displayProducts(response.data.products, response.data.pagination);
            } else {
                throw new Error('Invalid response format from server');
            }
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showErrorState(error.message);
        }
    }

    // Display products in grid
    displayProducts(products, pagination) {
        const grid = document.getElementById('products-grid');
        const loading = document.getElementById('loading-state');
        const noResults = document.getElementById('no-results');
        const paginationContainer = document.getElementById('pagination');

        // Hide loading state
        loading.classList.add('hidden');

        if (products.length === 0) {
            grid.classList.add('hidden');
            noResults.classList.remove('hidden');
            paginationContainer.classList.add('hidden');
            document.getElementById('results-count').textContent = '0';
            return;
        }

        // Show products grid
        noResults.classList.add('hidden');
        grid.classList.remove('hidden');

        // Update results count
        document.getElementById('results-count').textContent = pagination.total.toLocaleString();

        // Generate products HTML
        grid.innerHTML = products.map(product => this.createProductCard(product)).join('');

        // Display pagination
        this.displayPagination(pagination);
    }

    // Create product card HTML
    createProductCard(product) {
        const mainImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';
        const rating = product.rating?.average || 0;
        const ratingCount = product.rating?.count || 0;
        const brandName = product.brand?.name || 'Unknown Brand';
        const categoryName = product.category?.name || 'Uncategorized';
        const isInStock = product.variants?.some(v => v.stock > 0) || false;

        return `
            <div class="group relative bg-white text-black border-2 border-black overflow-hidden product-card">
                <div class="relative h-80 overflow-hidden">
                    <img src="${mainImage}" 
                         alt="${product.name}" 
                         class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                    
                    <!-- Hover Overlay -->
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition duration-300 flex items-center justify-center">
                        <a href="product.html?id=${product._id}" 
                           class="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition duration-300 bg-neon text-black px-6 py-3 font-bold tracking-wider uppercase">
                            VIEW PRODUCT
                        </a>
                    </div>

                    <!-- Price Tag -->
                    <div class="absolute top-4 left-4 bg-black text-white px-3 py-1">
                        <span class="text-sm font-bold tracking-wider">₹${product.basePrice.toLocaleString()}</span>
                    </div>

                    <!-- Stock Status -->
                    <div class="absolute top-4 right-4 ${isInStock ? 'bg-neon text-black' : 'bg-red-500 text-white'} px-2 py-1">
                        <span class="text-micro tracking-wider uppercase font-bold">${isInStock ? 'IN STOCK' : 'OUT OF STOCK'}</span>
                    </div>
                </div>
                
                <div class="p-4">
                    <!-- Category & Brand -->
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-micro tracking-wider uppercase text-gray-500">${categoryName}</span>
                        <span class="text-micro tracking-wider uppercase text-neon">${brandName}</span>
                    </div>

                    <!-- Product Name -->
                    <h3 class="text-lg font-bold uppercase tracking-wide mb-2 leading-tight">${product.name}</h3>

                    <!-- Description -->
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.description}</p>

                    <!-- Rating -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-1">
                            ${this.generateStarRating(rating)}
                            <span class="text-micro tracking-wider text-gray-500">(${ratingCount})</span>
                        </div>
                        <a href="product.html?id=${product._id}" 
                           class="text-black text-sm tracking-wider uppercase hover:text-neon transition duration-300 border-b border-transparent hover:border-neon">
                            DETAILS →
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate star rating HTML
    generateStarRating(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star text-neon text-xs"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="fas fa-star-half-alt text-neon text-xs"></i>';
            } else {
                stars += '<i class="far fa-star text-gray-300 text-xs"></i>';
            }
        }
        return stars;
    }

    // Display pagination
    displayPagination(pagination) {
        const container = document.getElementById('pagination');
        container.classList.remove('hidden');

        const { current, pages, total } = pagination;
        
        let paginationHTML = '';

        // Previous button
        if (current > 1) {
            paginationHTML += `
                <button onclick="productsManager.loadProducts(${current - 1})" 
                        class="px-4 py-2 border-2 border-black text-black font-bold tracking-wider uppercase hover:bg-black hover:text-white transition duration-300">
                    PREV
                </button>
            `;
        }

        // Page numbers
        for (let i = Math.max(1, current - 2); i <= Math.min(pages, current + 2); i++) {
            if (i === current) {
                paginationHTML += `
                    <button class="px-4 py-2 bg-black text-white font-bold tracking-wider uppercase">
                        ${i}
                    </button>
                `;
            } else {
                paginationHTML += `
                    <button onclick="productsManager.loadProducts(${i})" 
                            class="px-4 py-2 border-2 border-black text-black font-bold tracking-wider uppercase hover:bg-black hover:text-white transition duration-300">
                        ${i}
                    </button>
                `;
            }
        }

        // Next button
        if (current < pages) {
            paginationHTML += `
                <button onclick="productsManager.loadProducts(${current + 1})" 
                        class="px-4 py-2 border-2 border-black text-black font-bold tracking-wider uppercase hover:bg-black hover:text-white transition duration-300">
                    NEXT
                </button>
            `;
        }

        container.innerHTML = paginationHTML;
    }

    // Show loading state
    showLoadingState() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('products-grid').classList.add('hidden');
        document.getElementById('no-results').classList.add('hidden');
        document.getElementById('pagination').classList.add('hidden');
    }

    // Show loading state for filters
    showFilterLoadingState() {
        const categoriesContainer = document.getElementById('categories-list');
        const brandsContainer = document.getElementById('brands-list');
        
        categoriesContainer.innerHTML = `
            <div class="loading-pulse h-4 bg-gray-700 rounded"></div>
            <div class="loading-pulse h-4 bg-gray-700 rounded w-3/4"></div>
            <div class="loading-pulse h-4 bg-gray-700 rounded w-1/2"></div>
        `;
        
        brandsContainer.innerHTML = `
            <div class="loading-pulse h-4 bg-gray-700 rounded"></div>
            <div class="loading-pulse h-4 bg-gray-700 rounded w-3/4"></div>
            <div class="loading-pulse h-4 bg-gray-700 rounded w-1/2"></div>
        `;
    }

    // Show error state for filters
    showFilterErrorState() {
        const categoriesContainer = document.getElementById('categories-list');
        const brandsContainer = document.getElementById('brands-list');
        
        categoriesContainer.innerHTML = '<div class="text-gray-400 text-sm">Failed to load categories</div>';
        brandsContainer.innerHTML = '<div class="text-gray-400 text-sm">Failed to load brands</div>';
    }

    // Show error state with specific message
    showErrorState(errorMessage = 'Failed to load products') {
        const loading = document.getElementById('loading-state');
        const grid = document.getElementById('products-grid');
        const noResults = document.getElementById('no-results');
        const pagination = document.getElementById('pagination');

        loading.classList.add('hidden');
        grid.classList.add('hidden');
        pagination.classList.add('hidden');
        noResults.classList.remove('hidden');

        noResults.innerHTML = `
            <div class="text-6xl mb-4">⚠️</div>
            <h3 class="text-2xl font-black uppercase mb-2">CONNECTION ERROR</h3>
            <p class="text-gray-600 mb-4">${errorMessage}</p>
            <div class="space-y-2 text-sm text-gray-500 mb-6">
                <p>• Make sure the backend server is running on port 5000</p>
                <p>• Check that CORS is properly configured</p>
                <p>• Verify your internet connection</p>
            </div>
            <button onclick="location.reload()" class="bg-neon text-black px-6 py-3 font-bold tracking-wider uppercase hover:bg-black hover:text-neon transition duration-300">
                RETRY
            </button>
        `;
    }

    // Apply filters
    applyFilters() {
        this.currentPage = 1;
        this.updateSelectedFilters();
        this.loadProducts(1);
    }

    // Clear all filters
    clearFilters() {
        // Reset form elements
        document.getElementById('filter-search').value = '';
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('sort-option').value = '-createdAt';
        
        // Uncheck all checkboxes
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Update visuals
        this.updateCheckboxVisuals();

        // Reset filters and reload
        this.filters = {
            search: '',
            category: '',
            brand: '',
            minPrice: '',
            maxPrice: '',
            sort: '-createdAt'
        };

        this.loadProducts(1);
    }
}

// Global products manager instance
const productsManager = new ProductsManager();