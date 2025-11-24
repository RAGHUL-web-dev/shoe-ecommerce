// Dashboard Manager with cart integration
class DashboardManager {
    constructor() {
        this.userData = null;
        this.stats = {
            totalOrders: 0,
            wishlistCount: 0,
            reviewsCount: 0,
            cartItemsCount: 0
        };
    }

    // Load dashboard data
    async loadDashboard() {
        try {
            if (!isLoggedIn()) {
                window.location.href = 'login.html';
                return;
            }

            await this.loadUserProfile();
            await this.loadUserStats();
            await this.loadRecentOrders();
            await this.updateCartCount();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showToast('Error loading dashboard data', 'error');
        }
    }

    // Load user profile
    async loadUserProfile() {
        try {
            const response = await api.getCurrentUser();
            this.userData = response.data.user;
            this.displayUserProfile();
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    // Display user profile
    displayUserProfile() {
        const greeting = document.getElementById('dashboard-greeting');
        const memberSince = document.getElementById('member-since');
        const profileInfo = document.getElementById('profile-info');

        if (greeting) {
            const username = this.userData.username;
            const firstName = this.userData.profile?.firstName || username;
            greeting.textContent = `Welcome back, ${firstName}!`;
        }

        if (memberSince) {
            const joinDate = new Date(this.userData.createdAt).getFullYear();
            memberSince.textContent = joinDate;
        }

        if (profileInfo) {
            profileInfo.innerHTML = `
                <div class="flex justify-between items-center py-3 border-b border-gray-700">
                    <span class="text-sm tracking-wider uppercase text-gray-400">Username</span>
                    <span class="font-bold tracking-wider">${this.userData.username}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-gray-700">
                    <span class="text-sm tracking-wider uppercase text-gray-400">Email</span>
                    <span class="font-bold tracking-wider">${this.userData.email || 'Not set'}</span>
                </div>
                <div class="flex justify-between items-center py-3">
                    <span class="text-sm tracking-wider uppercase text-gray-400">Member Since</span>
                    <span class="font-bold tracking-wider">${new Date(this.userData.createdAt).toLocaleDateString()}</span>
                </div>
            `;
        }
    }

    // Load user stats
    async loadUserStats() {
        try {
            // Load orders count
            const ordersResponse = await api.getOrders({ limit: 1 });
            this.stats.totalOrders = ordersResponse.data.pagination?.total || 0;

            // Load cart count
            await this.updateCartCount();

            this.displayUserStats();
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    // Display user stats
    displayUserStats() {
        const totalOrders = document.getElementById('total-orders');
        const wishlistCount = document.getElementById('wishlist-count');
        const reviewsCount = document.getElementById('reviews-count');
        const cartItemsCount = document.getElementById('cart-items-count');

        if (totalOrders) totalOrders.textContent = this.stats.totalOrders;
        if (wishlistCount) wishlistCount.textContent = this.stats.wishlistCount;
        if (reviewsCount) reviewsCount.textContent = this.stats.reviewsCount;
        if (cartItemsCount) cartItemsCount.textContent = this.stats.cartItemsCount;
    }

    // Update cart count on dashboard
    async updateCartCount() {
        try {
            if (!isLoggedIn()) {
                this.stats.cartItemsCount = 0;
                this.displayUserStats();
                return;
            }

            const response = await api.getCart();
            const cart = response.data.cart;
            this.stats.cartItemsCount = cart.items.reduce((total, item) => total + item.quantity, 0);
            this.displayUserStats();
        } catch (error) {
            console.error('Error updating cart count:', error);
            this.stats.cartItemsCount = 0;
            this.displayUserStats();
        }
    }

    // Load recent orders
    async loadRecentOrders() {
        try {
            const response = await api.getOrders({ limit: 3 });
            const orders = response.data.orders || [];
            this.displayRecentOrders(orders);
        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    }

    // Display recent orders
    displayRecentOrders(orders) {
        const container = document.getElementById('recent-orders');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 border-2 border-dashed border-gray-300">
                    <div class="text-4xl mb-4">📦</div>
                    <h4 class="text-xl font-black uppercase mb-2">NO RECENT ORDERS</h4>
                    <p class="text-gray-600 mb-4">Your orders will appear here</p>
                    <a href="products.html" class="bg-neon text-black px-6 py-3 font-bold tracking-wider uppercase hover:bg-black hover:text-neon">
                        START SHOPPING
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="border-2 border-gray-200 p-4 hover:border-black transition duration-300">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold tracking-wider uppercase">Order #${order.orderNumber}</span>
                    <span class="text-sm tracking-wider uppercase ${this.getStatusColor(order.status)}">${order.status}</span>
                </div>
                <div class="flex justify-between items-center text-sm tracking-wider uppercase text-gray-500 mb-2">
                    <span>${new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>₹${order.totalAmount.toLocaleString()}</span>
                </div>
                <div class="text-sm tracking-wider">
                    ${order.items.length} item${order.items.length !== 1 ? 's' : ''}
                </div>
            </div>
        `).join('');
    }

    // Get status color
    getStatusColor(status) {
        const statusColors = {
            'pending': 'text-yellow-500',
            'confirmed': 'text-blue-500',
            'shipped': 'text-purple-500',
            'delivered': 'text-green-500',
            'cancelled': 'text-red-500'
        };
        return statusColors[status] || 'text-gray-500';
    }

    // Update reviews count
    async updateReviewsCount() {
        try {
            // This would call your reviews API
            // const response = await api.getUserReviews();
            // this.stats.reviewsCount = response.data.reviews.length;
            this.stats.reviewsCount = 0; // Placeholder
            this.displayUserStats();
        } catch (error) {
            console.error('Error updating reviews count:', error);
        }
    }
}

// Global dashboard manager instance
const dashboardManager = new DashboardManager();