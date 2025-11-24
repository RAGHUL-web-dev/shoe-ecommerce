// Products management
const products = {
    // Search products
    async searchProducts(query, filters = {}) {
        try {
            const params = { search: query, ...filters };
            return await api.getProducts(params);
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    },
    
    // Get products by category
    async getProductsByCategory(categoryId, params = {}) {
        try {
            const filters = { category: categoryId, ...params };
            return await api.getProducts(filters);
        } catch (error) {
            console.error('Error getting products by category:', error);
            throw error;
        }
    },
    
    // Get featured products
    async getFeaturedProducts(limit = 8) {
        try {
            return await api.getProducts({ limit, featured: true });
        } catch (error) {
            console.error('Error getting featured products:', error);
            throw error;
        }
    }
};