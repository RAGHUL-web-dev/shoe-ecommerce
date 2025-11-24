// API service functions
class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = getAuthToken();
        
        const config = {
            credentials: 'include', // Important for cookies
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        // Add Authorization header if token exists
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (options.body) { 
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                console.log('🔐 Authentication failed, clearing tokens');
                clearAuthToken();
                clearCurrentUser();
                updateAuthUI();
                
                // If we're not on login page, redirect
                if (!window.location.pathname.includes('login.html')) {
                    showToast('Session expired. Please login again.', 'warning');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
                
                throw new Error('Authentication required');
            }

            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Auth endpoints
    async signup(userData) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: userData,
        });
    }

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials,
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
        });
    }

    // User endpoints
    async getCurrentUser() {
        return this.request('/users/profile');
    }

    async updateUserProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PATCH',
            body: profileData,
        });
    }

    // Product endpoints
    async getProducts(queryParams = {}) {
        const queryString = new URLSearchParams(queryParams).toString();
        return this.request(`/products?${queryString}`);
    }

    async getProduct(id) {
        return this.request(`/products/${id}`);
    }

    // Category endpoints  
    async getCategories() {
        return this.request('/products/categories');
    }

    async getBrands() {
        return this.request('/products/brands');
    }

    // Cart endpoints
    async getCart() {
        return this.request('/cart');
    }

    async addToCart(itemData) {
        return this.request('/cart/add', {
            method: 'POST',
            body: itemData,
        });
    }

    async updateCartItem(itemId, quantity) {
        return this.request(`/cart/items/${itemId}`, {
            method: 'PATCH',
            body: { quantity },
        });
    }

    async removeFromCart(itemId) {
        return this.request(`/cart/items/${itemId}`, {
            method: 'DELETE',
        });
    }

    // Order endpoints
    async getOrders(queryParams = {}) {
        const queryString = new URLSearchParams(queryParams).toString();
        return this.request(`/orders?${queryString}`);
    }

    async createOrder(orderData) {
        return this.request('/orders', {
            method: 'POST',
            body: orderData,
        });
    }
}

// Create global API instance
const api = new ApiService();