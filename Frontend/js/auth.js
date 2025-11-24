// Check user role and update UI accordingly
function checkUserRole() {
    const userData = getUserData();
    const adminLink = document.getElementById('admin-link');
    const mobileAdminLink = document.getElementById('mobile-admin-link');
    
    if (userData && userData.role === 'admin') {
        // Show admin links
        if (adminLink) adminLink.classList.remove('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.remove('hidden');
    } else {
        // Hide admin links
        if (adminLink) adminLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
    }
}


// Authentication functions
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userData = getUserData();
    
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
    const mobileUserMenu = document.getElementById('mobile-user-menu');
    const usernameDisplay = document.getElementById('username-display');
    const userInitial = document.getElementById('user-initial');

    if (token && userData) {
        // User is logged in
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'none';
        if (mobileUserMenu) mobileUserMenu.style.display = 'block';
        
        if (usernameDisplay) {
            usernameDisplay.textContent = userData.username;
        }
        if (userInitial) {
            userInitial.textContent = userData.username.charAt(0).toUpperCase();
        }
    } else {
        // User is not logged in
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'block';
        if (mobileUserMenu) mobileUserMenu.style.display = 'none';
        
        // Also clear any cart data from localStorage if exists
        localStorage.removeItem('cart');
    }

    checkUserRole()
}



// Enhanced logout function
async function logout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local storage regardless of API call success
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('cart');
        
        // Update UI
        checkAuthStatus();
        updateCartCount();
        
        // Redirect to home page
        window.location.href = 'index.html';
    }
}

// Enhanced login function
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userData', JSON.stringify(data.data.user));
            
            // Update UI
            checkAuthStatus();
            updateCartCount();
            
            return { success: true, data };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

// Enhanced signup function
async function signup(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userData', JSON.stringify(data.data.user));
            
            // Update UI
            checkAuthStatus();
            updateCartCount();
            
            return { success: true, data };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

