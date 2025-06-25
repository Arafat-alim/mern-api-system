import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  postalCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'India'
  },
  phone: {
    type: String,
    required: true
  }
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
    type: shippingAddressSchema,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['razorpay', 'cod', 'wallet']
  },
  paymentResult: {
    id: String,
    status: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String
  },
  itemsPrice: {
    type: Number,
    required: true,
    min: 0
  },
  taxPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  shippingPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: Date,
  isDelivered: {
    type: Boolean,
    required: true,
    default: false
  },
  deliveredAt: Date,
  trackingNumber: String,
  estimatedDelivery: Date,
  notes: String,
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }]
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Method to add status update
orderSchema.methods.addStatusUpdate = function(status, note = '') {
  this.statusHistory.push({
    status,
    note,
    timestamp: new Date()
  });
  
  this.status = status;
  
  // Update payment status based on order status
  if (status === 'cancelled') {
    this.paymentStatus = 'refunded';
  } else if (status === 'delivered') {
    this.isDelivered = true;
    this.deliveredAt = new Date();
  }
  
  return this.save();
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.itemsPrice = this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  this.taxPrice = Math.round(this.itemsPrice * 0.18); // 18% GST
  this.shippingPrice = this.itemsPrice > 500 ? 0 : 50; // Free shipping above ₹500
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;
};

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

export default mongoose.model('Order', orderSchema);