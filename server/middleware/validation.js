import Joi from 'joi';

const createValidationMiddleware = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('. ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

// Auth validation schemas
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorCode: Joi.string().length(6).optional()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

// Product validation schemas
export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().positive().required(),
  originalPrice: Joi.number().positive().optional(),
  category: Joi.string().valid('electronics', 'clothing', 'books', 'home', 'sports', 'toys', 'other').required(),
  subcategory: Joi.string().max(50).optional(),
  brand: Joi.string().max(50).optional(),
  sku: Joi.string().max(50).optional(),
  stock: Joi.number().integer().min(0).required(),
  images: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      alt: Joi.string().optional(),
      isPrimary: Joi.boolean().optional()
    })
  ).min(1).required(),
  specifications: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  weight: Joi.number().positive().optional(),
  dimensions: Joi.object({
    length: Joi.number().positive().optional(),
    width: Joi.number().positive().optional(),
    height: Joi.number().positive().optional()
  }).optional(),
  seoTitle: Joi.string().max(60).optional(),
  seoDescription: Joi.string().max(160).optional()
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'description', 'price', 'category', 'stock', 'images'],
  (schema) => schema.optional()
);

// Order validation schemas
export const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      product: Joi.string().hex().length(24).required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    address: Joi.string().min(5).max(200).required(),
    city: Joi.string().min(2).max(50).required(),
    state: Joi.string().min(2).max(50).required(),
    postalCode: Joi.string().min(4).max(10).required(),
    country: Joi.string().default('India'),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).required()
  }).required(),
  paymentMethod: Joi.string().valid('razorpay', 'cod', 'wallet').required(),
  notes: Joi.string().max(500).optional()
});

// Export validation middleware functions
export const validateRegister = createValidationMiddleware(registerSchema);
export const validateLogin = createValidationMiddleware(loginSchema);
export const validateForgotPassword = createValidationMiddleware(forgotPasswordSchema);
export const validateResetPassword = createValidationMiddleware(resetPasswordSchema);
export const validateCreateProduct = createValidationMiddleware(createProductSchema);
export const validateUpdateProduct = createValidationMiddleware(updateProductSchema);
export const validateCreateOrder = createValidationMiddleware(createOrderSchema);

// Query parameter validation
export const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    search: Joi.string().max(100).optional()
  });

  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.details
    });
  }

  req.query = value;
  next();
};