// Utility functions with enhanced error handling
const API_BASE_URL = 'http://localhost:5000/api';

// Enhanced fetch wrapper with CORS support
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        mode: 'cors'
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                throw new Error('Authentication failed');
            }
            
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText || 'Request failed' };
            }
            
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Cannot connect to server. Please check if the backend is running on port 5000.');
        }
        
        throw error;
    }
}

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        return !isExpired;
    } catch {
        return false;
    }
}

// Get user data from localStorage
function getUserData() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    if (!toast) {
        const toastHTML = `
            <div id="toast" class="fixed top-4 right-4 bg-black text-white px-6 py-3 rounded-none border-2 border-neon transform translate-x-full transition-transform duration-300 z-50">
                <div class="flex items-center space-x-2">
                    <i id="toast-icon" class="fas fa-info-circle text-neon"></i>
                    <span id="toast-message" class="text-sm tracking-wider">${message}</span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
        return showToast(message, type);
    }

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const colors = {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-neon'
    };

    toastIcon.className = `fas ${icons[type] || icons.info} ${colors[type] || colors.info}`;
    toastMessage.textContent = message;

    toast.classList.remove('translate-x-full');
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 4000);
}

// Update cart count in navbar
async function updateCartCount() {
    if (!isLoggedIn()) {
        hideCartCounts();
        return;
    }

    try {
        const data = await apiFetch('/cart');
        
        if (data.data && data.data.cart) {
            const cartCount = data.data.cart.totalItems || 0;
            updateCartCountUI(cartCount);
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        hideCartCounts();
    }
}

function updateCartCountUI(cartCount) {
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

function hideCartCounts() {
    const navCartCount = document.getElementById('nav-cart-count');
    const mobileNavCartCount = document.getElementById('mobile-nav-cart-count');
    
    if (navCartCount) {
        navCartCount.classList.add('hidden');
    }
    if (mobileNavCartCount) {
        mobileNavCartCount.classList.add('hidden');
    }
}

// Test server connection
async function testServerConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('Server connection: OK');
            return true;
        }
    } catch (error) {
        console.error('Server connection: FAILED', error);
        showToast('Cannot connect to server. Please make sure the backend is running on port 5000.', 'error');
        return false;
    }
}