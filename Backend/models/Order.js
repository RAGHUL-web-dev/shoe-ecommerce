const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'cod'],
    required: true
  },
  paymentIntentId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  subtotal: Number,
  shipping: Number,
  tax: Number,
  discount: Number,
  payment: paymentSchema,
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
      'refunded'
    ],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  trackingNumber: String,
  shippingProvider: String,
  estimatedDelivery: Date,
  cancellationReason: String,
  returnReason: String,
  refundAmount: Number,
  notes: String
}, {
  timestamps: true
});

// Generate order number before save
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const count = await mongoose.model('Order').countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    
    this.orderNumber = `ORD-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    
    // Initialize status history
    this.statusHistory.push({
      status: this.status,
      note: 'Order created'
    });
  }
  
  // Update status history when status changes
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      note: `Status updated to ${this.status}`
    });
  }
  
  // Calculate item totals
  if (this.isModified('items')) {
    this.items.forEach(item => {
      item.total = item.quantity * item.price;
    });
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);