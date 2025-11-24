// Cart-specific functions
const cartAPI = {
    // Get cart with proper authentication
    async getCart() {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('User not authenticated');
        }

        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            throw new Error('Authentication failed');
        }

        return await response.json();
    },

    // Add to cart with authentication
    async addToCart(cartData) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login to add items to cart');
        }

        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cartData),
            credentials: 'include'
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            throw new Error('Authentication failed');
        }

        return await response.json();
    },

    // Update cart item
    async updateCartItem(itemId, quantity) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login to update cart');
        }

        const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ quantity })
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            throw new Error('Authentication failed');
        }

        return await response.json();
    },

    // Remove from cart
    async removeFromCart(itemId) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login to modify cart');
        }

        const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            throw new Error('Authentication failed');
        }

        return await response.json();
    },

    // Clear cart
    async clearCart() {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login to clear cart');
        }

        const response = await fetch(`${API_BASE_URL}/cart/clear`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            throw new Error('Authentication failed');
        }

        return await response.json();
    }
};

// Enhanced cart count update with better error handling
async function updateCartCount() {
    if (!isLoggedIn()) {
        // User is not logged in, hide cart counts
        const navCartCount = document.getElementById('nav-cart-count');
        const mobileNavCartCount = document.getElementById('mobile-nav-cart-count');
        
        if (navCartCount) {
            navCartCount.classList.add('hidden');
        }
        if (mobileNavCartCount) {
            mobileNavCartCount.classList.add('hidden');
        }
        return;
    }

    try {
        const response = await cartAPI.getCart();
        
        if (response.data && response.data.cart) {
            const cartCount = response.data.cart.totalItems || 0;
            
            // Update desktop cart count
            const navCartCount = document.getElementById('nav-cart-count');
            const mobileNavCartCount = document.getElementById('mobile-nav-cart-count');
            
            if (navCartCount) {
                navCartCount.textContent = cartCount;
                if (cartCount > 0) {
                    navCartCount.classList.remove('hidden');
                } else {
                    navCartCount.classList.add('hidden');
                }
            }
            
            if (mobileNavCartCount) {
                mobileNavCartCount.textContent = cartCount;
                if (cartCount > 0) {
                    mobileNavCartCount.classList.remove('hidden');
                } else {
                    mobileNavCartCount.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        
        // If it's an authentication error, log the user out
        if (error.message === 'Authentication failed' || error.message.includes('401')) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            checkAuthStatus(); // Update UI to show login buttons
        }
        
        // Hide cart counts on error
        const navCartCount = document.getElementById('nav-cart-count');
        const mobileNavCartCount = document.getElementById('mobile-nav-cart-count');
        
        if (navCartCount) {
            navCartCount.classList.add('hidden');
        }
        if (mobileNavCartCount) {
            mobileNavCartCount.classList.add('hidden');
        }
    }
}

// Enhanced add to cart function with better error handling
async function addToCart(productId, variant = null, quantity = 1) {
    try {
        if (!isLoggedIn()) {
            showToast('Please login to add items to cart', 'warning');
            // Redirect to login after a delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }

        // If variant is not provided, get the first available variant
        if (!variant) {
            const productResponse = await api.getProduct(productId);
            const product = productResponse.data.product;
            const firstVariant = product.variants?.find(v => v.stock > 0);
            
            if (!firstVariant) {
                showToast('No available variants in stock', 'error');
                return false;
            }
            
            variant = {
                size: firstVariant.size,
                color: firstVariant.color,
                sku: firstVariant.sku
            };
        }

        const cartData = {
            productId: productId,
            variant: variant,
            quantity: quantity
        };

        const result = await cartAPI.addToCart(cartData);
        
        if (result.status === 'success') {
            showToast('Product added to cart', 'success');
            await updateCartCount(); // Update cart count immediately
            return true;
        } else {
            showToast(result.message || 'Error adding to cart', 'error');
            return false;
        }

    } catch (error) {
        console.error('Error adding to cart:', error);
        
        if (error.message.includes('Authentication failed') || error.message.includes('401')) {
            showToast('Your session has expired. Please login again.', 'error');
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            checkAuthStatus();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else if (error.message.includes('Please login')) {
            showToast(error.message, 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast(error.message || 'Error adding to cart', 'error');
        }
        return false;
    }
}

// Initialize cart functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
});