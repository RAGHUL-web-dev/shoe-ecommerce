const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    size: String,
    color: String,
    sku: String
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  isLowStock: {
    type: Boolean,
    default: false
  },
  lastRestocked: Date
}, {
  timestamps: true
});

// Update low stock flag before save
inventorySchema.pre('save', function(next) {
  this.isLowStock = this.quantity <= this.lowStockThreshold;
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);