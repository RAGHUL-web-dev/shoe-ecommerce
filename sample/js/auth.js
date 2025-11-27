function isLoggedIn() {
    // Check both localStorage and cookies
    const hasLocalToken = localStorage.getItem('token');
    const hasCookieToken = document.cookie.includes('token=');
    return hasLocalToken || hasCookieToken;
}

function getAuthToken() {
    // Try to get token from localStorage first, then cookies
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // Extract from cookies
    const cookieMatch = document.cookie.match(/token=([^;]+)/);
    return cookieMatch ? cookieMatch[1] : null;
}

function setAuthToken(token) {
    // Store in both localStorage and cookies for redundancy
    localStorage.setItem('token', token);
    
    // Also set a cookie (for API requests)
    const isProduction = window.location.hostname !== 'localhost';
    document.cookie = `token=${token}; path=/; max-age=604800; ${isProduction ? 'secure; samesite=none' : 'samesite=lax'}`;
}

function clearAuthToken() {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

function setCurrentUser(user, token = null) {
    localStorage.setItem('user', JSON.stringify(user));
    if (token) {
        localStorage.setItem('token', token);
    }
}

function clearCurrentUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
}

// Update UI based on authentication status
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
    const mobileUserMenu = document.getElementById('mobile-user-menu');

    if (isLoggedIn()) {
        const user = getCurrentUser();
        
        // Update desktop view
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            userMenu.classList.remove('hidden');
        }
        
        // Update mobile view
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'none';
        if (mobileUserMenu) {
            mobileUserMenu.style.display = 'block';
            mobileUserMenu.classList.remove('hidden');
        }
        
        // Update user information
        if (document.getElementById('username-display')) {
            document.getElementById('username-display').textContent = user.username;
        }
        if (document.getElementById('user-initial')) {
            document.getElementById('user-initial').textContent = user.username.charAt(0).toUpperCase();
        }
    } else {
        // Update desktop view
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) {
            userMenu.style.display = 'none';
            userMenu.classList.add('hidden');
        }
        
        // Update mobile view
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'block';
        if (mobileUserMenu) {
            mobileUserMenu.style.display = 'none';
            mobileUserMenu.classList.add('hidden');
        }
    }
}

// Check authentication status on page load
function checkAuthStatus() {
    updateAuthUI();
    
    // If on auth pages and already logged in, redirect to dashboard
    if (isLoggedIn() && (window.location.pathname.includes('login.html') || 
                         window.location.pathname.includes('signup.html'))) {
        window.location.href = 'dashboard.html';
    }
    
    // If on protected pages and not logged in, redirect to login
    if (!isLoggedIn() && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'login.html';
    }
}

// Signup function
async function signup(userData) {
    try {
        const response = await api.signup(userData);
        
        showToast('Account created successfully!', 'success');
        
        // Store user data and token properly
        setCurrentUser(response.data.user);
        setAuthToken(response.token);
        updateAuthUI();
        
        // Wait a bit for auth state to settle, then update cart
        setTimeout(() => {
            updateCartCount();
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        showToast(error.message || 'Signup failed. Please try again.', 'error');
        console.error('Signup error:', error);
    }
}

// Login function
async function login(username, password) {
    try {
        const response = await api.login({ username, password });
        
        showToast('Login successful!', 'success');
        
        // Store user data and token properly
        setCurrentUser(response.data.user);
        setAuthToken(response.token); // Use the new setAuthToken function
        
        updateAuthUI();
        
        // Wait a bit for auth state to settle, then update cart
        setTimeout(() => {
            updateCartCount();
            
            // Redirect to previous page or dashboard
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        }, 1000);
        
    } catch (error) {
        showToast(error.message || 'Login failed. Please check your credentials.', 'error');
        console.error('Login error:', error);
    }
}


// Logout function
async function logout() {
    try {
        await api.logout();
        
        // Clear local storage
        clearCurrentUser();
        updateAuthUI();
        
        showToast('Logged out successfully', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local storage and redirect even if API call fails
        clearCurrentUser();
        updateAuthUI();
        window.location.href = 'index.html';
    }
}

// Initialize auth when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Make functions available globally
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.signup = signup;
window.login = login;
window.logout = logout;
window.checkAuthStatus = checkAuthStatus;
window.updateAuthUI = updateAuthUI;