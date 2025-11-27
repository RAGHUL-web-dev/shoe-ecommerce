// Enhanced Cart Manager with comprehensive functionality
class CartManager {
    constructor() {
        this.cart = null;
        this.coupon = null;
        this.isLoading = false;
    }

    // Load cart from backend
    async loadCart() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            if (!isLoggedIn()) {
                this.showEmptyCart();
                this.isLoading = false;
                return;
            }

            const response = await api.getCart();
            this.cart = response.data.cart;
            this.displayCart();
            
        } catch (error) {
            console.error('Error loading cart:', error);
            if (error.message.includes('Authentication required') || error.message.includes('401')) {
                this.showEmptyCart();
            } else {
                showToast('Error loading cart', 'error');
                this.showEmptyCart();
            }
        } finally {
            this.isLoading = false;
        }
    }

    // Display cart items
    displayCart() {
        const emptyCart = document.getElementById('empty-cart');
        const cartItems = document.getElementById('cart-items');
        const cartLoading = document.getElementById('cart-loading');
        const checkoutBtn = document.getElementById('checkout-btn');

        if (!this.cart || this.cart.items.length === 0) {
            this.showEmptyCart();
            return;
        }

        // Hide empty cart and loading, show items
        if (emptyCart) emptyCart.classList.add('hidden');
        if (cartLoading) cartLoading.classList.add('hidden');
        if (cartItems) cartItems.classList.remove('hidden');
        if (checkoutBtn) checkoutBtn.classList.remove('hidden');

        // Display cart items
        if (cartItems) {
            cartItems.innerHTML = this.cart.items.map(item => this.createCartItemHTML(item)).join('');
        }

        // Update cart summary
        this.updateCartSummary();

        // Update cart count in navigation
        this.updateCartCount();
    }

    // Create cart item HTML
    createCartItemHTML(item) {
        const product = item.product;
        const variant = item.variant;
        const totalPrice = item.quantity * item.price;

        return `
            <div class="bg-white border-2 border-black p-6 mb-4" data-item-id="${item._id}">
                <div class="flex flex-col md:flex-row gap-6">
                    <!-- Product Image -->
                    <div class="flex-shrink-0">
                        <img src="${product.images?.[0]?.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80'}" 
                             alt="${product.name}" 
                             class="w-32 h-32 object-cover border-2 border-black">
                    </div>

                    <!-- Product Details -->
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="text-xl font-bold uppercase tracking-wide mb-1">${product.name}</h3>
                                <div class="flex items-center space-x-4 text-micro tracking-wider uppercase text-gray-500">
                                    <span>Size: ${variant.size}</span>
                                    <span>•</span>
                                    <span>Color: ${variant.color}</span>
                                    <span>•</span>
                                    <span>SKU: ${variant.sku}</span>
                                </div>
                            </div>
                            <button onclick="cartManager.removeItem('${item._id}')" 
                                    class="text-red-500 hover:text-red-700 transition duration-300 p-2">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>

                        <div class="flex justify-between items-center mt-4">
                            <!-- Quantity Controls -->
                            <div class="flex items-center space-x-2">
                                <button onclick="cartManager.updateQuantity('${item._id}', ${item.quantity - 1})" 
                                        class="quantity-btn w-10 h-10 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition duration-300">-</button>
                                <input type="number" 
                                       value="${item.quantity}" 
                                       min="1" 
                                       class="quantity-input w-16 h-10 border-2 border-black text-center font-bold"
                                       onchange="cartManager.updateQuantity('${item._id}', parseInt(this.value))">
                                <button onclick="cartManager.updateQuantity('${item._id}', ${item.quantity + 1})" 
                                        class="quantity-btn w-10 h-10 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition duration-300">+</button>
                            </div>

                            <!-- Price -->
                            <div class="text-right">
                                <div class="text-2xl font-black text-neon">₹${totalPrice.toLocaleString()}</div>
                                <div class="text-sm tracking-wider uppercase text-gray-500">
                                    ₹${item.price.toLocaleString()} each
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Update cart summary
    updateCartSummary() {
        if (!this.cart) return;

        const subtotal = this.cart.totalPrice || this.calculateSubtotal();
        const shipping = subtotal > 999 ? 0 : 50;
        const tax = subtotal * 0.18; // 18% GST
        const total = subtotal + shipping + tax;

        const summarySubtotal = document.getElementById('summary-subtotal');
        const summaryShipping = document.getElementById('summary-shipping');
        const summaryTax = document.getElementById('summary-tax');
        const summaryTotal = document.getElementById('summary-total');
        const cartTotal = document.getElementById('cart-total');
        const cartItemsCount = document.getElementById('cart-items-count');

        if (summarySubtotal) summarySubtotal.textContent = `₹${subtotal.toLocaleString()}`;
        if (summaryShipping) summaryShipping.textContent = shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString()}`;
        if (summaryTax) summaryTax.textContent = `₹${tax.toLocaleString()}`;
        if (summaryTotal) summaryTotal.textContent = `₹${total.toLocaleString()}`;
        if (cartTotal) cartTotal.textContent = `₹${total.toLocaleString()}`;
        
        const totalItems = this.calculateTotalItems();
        if (cartItemsCount) cartItemsCount.textContent = `${totalItems} ITEM${totalItems !== 1 ? 'S' : ''}`;
    }

    // Calculate subtotal from cart items
    calculateSubtotal() {
        if (!this.cart || !this.cart.items) return 0;
        return this.cart.items.reduce((total, item) => total + (item.quantity * item.price), 0);
    }

    // Calculate total items in cart
    calculateTotalItems() {
        if (!this.cart || !this.cart.items) return 0;
        return this.cart.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Update cart count in navigation
    async updateCartCount() {
        try {
            // Check if user is logged in first
            if (!isLoggedIn()) {
                console.log('👤 Not logged in, hiding cart count');
                this.hideCartCount();
                return;
            }

            let totalItems = 0;

            try {
                // Fetch from API
                const response = await api.getCart();
                
                // Check if response has the expected structure
                if (response && response.data && response.data.cart) {
                    const cart = response.data.cart;
                    totalItems = cart.items ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
                    console.log(`🛒 Cart count from API: ${totalItems} items`);
                } else {
                    console.warn('⚠️ Unexpected cart response structure:', response);
                    totalItems = 0;
                }
            } catch (error) {
                console.error('❌ Error fetching cart for count:', error);
                
                // If it's an authentication error, clear user data
                if (error.message.includes('Authentication required') || error.message.includes('401')) {
                    console.log('🔐 Authentication failed, clearing user data');
                    clearCurrentUser();
                    updateAuthUI();
                }
                
                totalItems = 0;
            }

            console.log(`🛒 Final cart count: ${totalItems} items`);
            this.updateCartCountUI(totalItems);
            
        } catch (error) {
            console.error('❌ Error in updateCartCount:', error);
            this.hideCartCount();
        }
    }

    // Update cart count UI
    updateCartCountUI(totalItems) {
        const cartCount = document.getElementById('nav-cart-count');
        const mobileCartCount = document.getElementById('mobile-nav-cart-count');
        
        if (cartCount) {
            if (totalItems > 0) {
                cartCount.textContent = totalItems;
                cartCount.classList.remove('hidden');
            } else {
                cartCount.classList.add('hidden');
            }
        }
        
        if (mobileCartCount) {
            if (totalItems > 0) {
                mobileCartCount.textContent = totalItems;
                mobileCartCount.classList.remove('hidden');
            } else {
                mobileCartCount.classList.add('hidden');
            }
        }
    }

    // Hide cart count
    hideCartCount() {
        const cartCount = document.getElementById('nav-cart-count');
        const mobileCartCount = document.getElementById('mobile-nav-cart-count');
        
        if (cartCount) cartCount.classList.add('hidden');
        if (mobileCartCount) mobileCartCount.classList.add('hidden');
    }

    // Update item quantity
    async updateQuantity(itemId, newQuantity) {
        if (newQuantity < 1) {
            this.removeItem(itemId);
            return;
        }

        try {
            await api.updateCartItem(itemId, newQuantity);
            showToast('Cart updated successfully', 'success');
            await this.loadCart(); // Reload cart to get updated data
            await this.updateDashboardCartCount(); // Update dashboard
        } catch (error) {
            console.error('Error updating quantity:', error);
            showToast(error.message || 'Error updating quantity', 'error');
        }
    }

    // Remove item from cart
    async removeItem(itemId) {
        try {
            await api.removeFromCart(itemId);
            showToast('Item removed from cart', 'success');
            await this.loadCart(); // Reload cart to get updated data
            await this.updateDashboardCartCount(); // Update dashboard
        } catch (error) {
            console.error('Error removing item:', error);
            showToast(error.message || 'Error removing item', 'error');
        }
    }

    // Add item to cart (universal function) - FIXED: Renamed to avoid recursion
    async addItemToCart(productId, variant, quantity = 1) {
        try {
            if (!isLoggedIn()) {
                showToast('Please login to add items to cart', 'warning');
                // Store current URL for redirect back after login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return false;
            }

            const cartData = {
                productId: productId,
                variant: variant,
                quantity: quantity
            };

            await api.addToCart(cartData);
            showToast('Product added to cart successfully!', 'success');
            
            // Update cart everywhere
            await this.loadCart();
            await this.updateCartCount();
            await this.updateDashboardCartCount();
            
            return true;
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast(error.message || 'Error adding product to cart', 'error');
            return false;
        }
    }

    // Update dashboard cart count
    async updateDashboardCartCount() {
        try {
            const cartItemsCountElement = document.getElementById('cart-items-count');
            if (cartItemsCountElement) {
                if (this.cart && this.cart.items) {
                    const totalItems = this.calculateTotalItems();
                    cartItemsCountElement.textContent = totalItems;
                } else {
                    const response = await api.getCart();
                    const cart = response.data.cart;
                    const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
                    cartItemsCountElement.textContent = totalItems;
                }
            }
        } catch (error) {
            console.error('Error updating dashboard cart count:', error);
        }
    }

    // Apply coupon code
    async applyCoupon() {
        const couponInput = document.getElementById('coupon-code');
        if (!couponInput) return;

        const couponCode = couponInput.value.trim();
        if (!couponCode) {
            showToast('Please enter a coupon code', 'warning');
            return;
        }

        try {
            // This would call your coupon validation API
            // const response = await api.validateCoupon({
            //     code: couponCode,
            //     totalAmount: this.cart.totalPrice
            // });

            // this.coupon = response.data.coupon;
            showToast('Coupon applied successfully', 'success');
            this.updateCartSummary(); // Recalculate with discount

        } catch (error) {
            console.error('Error applying coupon:', error);
            showToast(error.message || 'Invalid coupon code', 'error');
        }
    }

    // Proceed to checkout
    proceedToCheckout() {
        if (!this.cart || this.cart.items.length === 0) {
            showToast('Your cart is empty', 'warning');
            return;
        }

        if (!isLoggedIn()) {
            showToast('Please login to checkout', 'warning');
            window.location.href = 'login.html';
            return;
        }

        // Redirect to checkout page
        showToast('Proceeding to checkout...', 'success');
        window.location.href = 'checkout.html';
    }

    // Show empty cart state
    showEmptyCart() {
        const emptyCart = document.getElementById('empty-cart');
        const cartItems = document.getElementById('cart-items');
        const cartLoading = document.getElementById('cart-loading');
        const checkoutBtn = document.getElementById('checkout-btn');

        if (emptyCart) emptyCart.classList.remove('hidden');
        if (cartItems) cartItems.classList.add('hidden');
        if (cartLoading) cartLoading.classList.add('hidden');
        if (checkoutBtn) checkoutBtn.classList.add('hidden');
        
        // Reset summary
        this.resetCartSummary();
        
        // Update cart count
        this.updateCartCount();
    }

    // Reset cart summary
    resetCartSummary() {
        const summarySubtotal = document.getElementById('summary-subtotal');
        const summaryShipping = document.getElementById('summary-shipping');
        const summaryTax = document.getElementById('summary-tax');
        const summaryTotal = document.getElementById('summary-total');
        const cartTotal = document.getElementById('cart-total');
        const cartItemsCount = document.getElementById('cart-items-count');

        if (summarySubtotal) summarySubtotal.textContent = '₹0';
        if (summaryShipping) summaryShipping.textContent = '₹0';
        if (summaryTax) summaryTax.textContent = '₹0';
        if (summaryTotal) summaryTotal.textContent = '₹0';
        if (cartTotal) cartTotal.textContent = '₹0';
        if (cartItemsCount) cartItemsCount.textContent = '0 ITEMS';
    }
}

// Global cart manager instance
const cartManager = new CartManager();

// Global function to update cart count (can be called from any page)
async function updateCartCount() {
    await cartManager.updateCartCount();
}

// Load cart function for cart page
function loadCart() {
    cartManager.loadCart();
}

// Apply coupon function for cart page
function applyCoupon() {
    cartManager.applyCoupon();
}

// Proceed to checkout function for cart page
function proceedToCheckout() {
    cartManager.proceedToCheckout();
}

// Global add to cart function - FIXED: Uses the renamed method
async function addToCart(productId, variant, quantity = 1) {
    return await cartManager.addItemToCart(productId, variant, quantity);
}

// Make functions available globally
window.cartManager = cartManager;
window.updateCartCount = updateCartCount;
window.loadCart = loadCart;
window.applyCoupon = applyCoupon;
window.proceedToCheckout = proceedToCheckout;
window.addToCart = addToCart;