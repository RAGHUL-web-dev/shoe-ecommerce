// API functions using the apiFetch from utils.js
const api = {
    // Get products
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiFetch(`/products?${queryString}`);
    },

    // Get single product
    async getProduct(id) {
        return await apiFetch(`/products/${id}`);
    },

    // Get categories
    async getCategories() {
        return await apiFetch('/products/categories');
    },

    // Get brands
    async getBrands() {
        return await apiFetch('/products/brands');
    },

    // Validate coupon
    async validateCoupon(code, totalAmount) {
        return await apiFetch('/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code, totalAmount })
        });
    },

    // Add to cart
    async addToCart(cartData) {
        return await apiFetch('/cart/add', {
            method: 'POST',
            body: JSON.stringify(cartData)
        });
    },

    // Get cart
    async getCart() {
        return await apiFetch('/cart');
    },

    // Get user orders
    async getOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiFetch(`/orders?${queryString}`);
    },

    // Get single order
    async getOrder(id) {
        return await apiFetch(`/orders/${id}`);
    },

    // Create order
    async createOrder(orderData) {
        return await apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    // Cancel order
    async cancelOrder(orderId, reason) {
        return await apiFetch(`/orders/${orderId}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
    },

    // Request return
    async requestReturn(orderId, reason) {
        return await apiFetch(`/orders/${orderId}/return`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
    },

    // User profile management
    async updateProfile(profileData) {
        return await apiFetch('/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(profileData)
        });
    },

    // Get user addresses
    async getAddresses() {
        return await apiFetch('/users/addresses');
    },

    // Add address
    async addAddress(addressData) {
        return await apiFetch('/users/addresses', {
            method: 'POST',
            body: JSON.stringify(addressData)
        });
    },

    // Update address
    async updateAddress(addressId, addressData) {
        return await apiFetch(`/users/addresses/${addressId}`, {
            method: 'PATCH',
            body: JSON.stringify(addressData)
        });
    },

    // Delete address
    async deleteAddress(addressId) {
        return await apiFetch(`/users/addresses/${addressId}`, {
            method: 'DELETE'
        });
    },

    // Change password
    async changePassword(passwordData) {
        return await apiFetch('/users/change-password', {
            method: 'PATCH',
            body: JSON.stringify(passwordData)
        });
    },

    // Checkout calculation
    async calculateCheckout(checkoutData) {
        return await apiFetch('/checkout/calculate', {
            method: 'POST',
            body: JSON.stringify(checkoutData)
        });
    }
};