export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MERN Stack API',
      version: '1.0.0',
      description: 'A comprehensive MERN stack API with JWT authentication, OAuth 2.0, 2FA, payments, and more',
      contact: {
        name: 'API Support',
        email: 'support@mernapi.com'
      },
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.yourapp.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              default: 'user'
            },
            isEmailVerified: {
              type: 'boolean',
              default: false
            },
            twoFactorEnabled: {
              type: 'boolean',
              default: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
            _id: {
              type: 'string'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            price: {
              type: 'number',
              minimum: 0
            },
            category: {
              type: 'string'
            },
            stock: {
              type: 'number',
              minimum: 0,
              default: 0
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              default: 0
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Order: {
          type: 'object',
          required: ['user', 'items', 'totalAmount'],
          properties: {
            _id: {
              type: 'string'
            },
            user: {
              type: 'string',
              description: 'User ID'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: {
                    type: 'string'
                  },
                  quantity: {
                    type: 'number',
                    minimum: 1
                  },
                  price: {
                    type: 'number'
                  }
                }
              }
            },
            totalAmount: {
              type: 'number',
              minimum: 0
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
              default: 'pending'
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'refunded'],
              default: 'pending'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Products',
        description: 'Product catalog management'
      },
      {
        name: 'Orders',
        description: 'Order management system'
      },
      {
        name: 'Payments',
        description: 'Payment processing and webhooks'
      }
    ]
  },
  apis: ['./server/routes/*.js']
};