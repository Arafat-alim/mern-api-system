# MERN Stack API System

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive, production-ready MERN stack API system featuring JWT authentication, OAuth 2.0 integration, two-factor authentication, payment processing, and complete Swagger documentation. Built with modern best practices and enterprise-grade security.

## 🚀 Features

### Authentication & Security
- **JWT Authentication** - Secure token-based authentication with access and refresh tokens
- **OAuth 2.0 Integration** - Google OAuth for seamless third-party authentication
- **Two-Factor Authentication (2FA)** - TOTP-based 2FA with backup codes
- **Account Security** - Login attempt limiting, account locking, and password reset
- **Rate Limiting** - API rate limiting to prevent abuse
- **Security Headers** - Helmet.js for security headers

### Core Functionality
- **User Management** - Complete user CRUD operations with role-based access
- **Product Catalog** - Full-featured product management with categories, reviews, and search
- **Order Management** - Comprehensive order processing with status tracking
- **Payment Integration** - Razorpay payment gateway with webhook support
- **File Upload** - Image upload and management capabilities

### API Documentation
- **Swagger UI** - Interactive API documentation with live testing
- **OpenAPI 3.0** - Industry-standard API specification
- **Real-time Testing** - Test endpoints directly from the documentation

### Additional Features
- **Email Integration** - Nodemailer for transactional emails
- **Data Validation** - Joi validation for all inputs
- **Error Handling** - Comprehensive error handling with custom error classes
- **Logging** - Morgan logging for request tracking
- **CORS Support** - Cross-origin resource sharing configuration

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Authentication & Security
- **JSON Web Tokens (JWT)** - Token-based authentication
- **Passport.js** - Authentication middleware
- **bcryptjs** - Password hashing
- **Speakeasy** - Two-factor authentication
- **Helmet** - Security headers

### Payment & Communication
- **Razorpay** - Payment gateway integration
- **Nodemailer** - Email service
- **QRCode** - QR code generation for 2FA

### Documentation & Validation
- **Swagger JSDoc** - API documentation generation
- **Swagger UI Express** - Interactive API documentation
- **Joi** - Data validation

### Frontend
- **React** - User interface library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and development server
- **Lucide React** - Icon library

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **npm** (v8.x or higher)
- **MongoDB** (v6.x or higher)
- **Git**

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/mern-api-system.git
cd mern-api-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/mern-api

# JWT Secrets (Generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (Get from Google API Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Razorpay Configuration (Get from Razorpay Dashboard)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Session Secret
SESSION_SECRET=your-session-secret-change-this-in-production
```

### 4. Start MongoDB
Ensure MongoDB is running on your system:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# On Windows
net start MongoDB
```

### 5. Run the Application
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Backend only
npm run server

# Frontend only
npm run client
```

## 📖 Usage

### API Documentation
Once the server is running, access the interactive API documentation at:
```
http://localhost:5000/api-docs
```

### Health Check
Verify the API is running:
```bash
curl http://localhost:5000/api/health
```

### Authentication Flow

#### 1. Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Access Protected Routes
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Two-Factor Authentication Setup

#### 1. Setup 2FA
```bash
curl -X POST http://localhost:5000/api/auth/setup-2fa \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 2. Verify 2FA
```bash
curl -X POST http://localhost:5000/api/auth/verify-2fa \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456"
  }'
```

### Product Management

#### Create a Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Product",
    "description": "A great product",
    "price": 99.99,
    "category": "electronics",
    "stock": 100,
    "images": [{"url": "https://example.com/image.jpg", "isPrimary": true}]
  }'
```

#### Get Products with Filtering
```bash
curl "http://localhost:5000/api/products?category=electronics&minPrice=50&maxPrice=200&page=1&limit=10"
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `5000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | Access token expiry | No | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | No | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No* | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No* | - |
| `EMAIL_HOST` | SMTP host | No* | - |
| `EMAIL_PORT` | SMTP port | No* | `587` |
| `EMAIL_USER` | SMTP username | No* | - |
| `EMAIL_PASS` | SMTP password | No* | - |
| `RAZORPAY_KEY_ID` | Razorpay key ID | No* | - |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | No* | - |

*Required for specific features

### Database Configuration
The application uses MongoDB with Mongoose ODM. Ensure your MongoDB instance is running and accessible via the `MONGODB_URI`.

### OAuth Setup
To enable Google OAuth:
1. Go to [Google API Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`

### Payment Gateway Setup
To enable Razorpay payments:
1. Sign up at [Razorpay](https://razorpay.com/)
2. Get your API keys from the dashboard
3. Configure webhook URL: `http://localhost:5000/api/payments/webhook`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/setup-2fa` - Setup two-factor authentication
- `POST /auth/verify-2fa` - Verify and enable 2FA
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback

### User Management
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID (Admin only)
- `PUT /users/:id` - Update user (Admin only)
- `DELETE /users/:id` - Delete user (Admin only)

### Product Management
- `GET /products` - Get all products with filtering
- `POST /products` - Create new product
- `GET /products/:id` - Get product by ID
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/:id/reviews` - Add product review

### Order Management
- `POST /orders` - Create new order
- `GET /orders` - Get user orders
- `GET /orders/:id` - Get order by ID
- `PUT /orders/:id/cancel` - Cancel order
- `GET /orders/admin/all` - Get all orders (Admin only)
- `PUT /orders/:id/status` - Update order status (Admin only)

### Payment Processing
- `POST /payments/create-razorpay-order` - Create Razorpay order
- `POST /payments/verify-payment` - Verify payment
- `POST /payments/webhook` - Payment webhook handler
- `POST /payments/refund` - Process refund (Admin only)

For detailed API documentation with request/response examples, visit the Swagger UI at `/api-docs`.

## 🧪 Testing

### Manual Testing
Use the Swagger UI interface at `http://localhost:5000/api-docs` to test all endpoints interactively.

### API Testing Tools
- **Postman** - Import the OpenAPI specification from `/api/docs.json`
- **Insomnia** - Use the OpenAPI specification for endpoint testing
- **curl** - Command-line testing (examples provided above)

## 🚀 Deployment

### Production Environment
1. Set `NODE_ENV=production` in your environment
2. Use a production MongoDB instance
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Use a process manager like PM2

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables for Production
Ensure all sensitive environment variables are properly configured in your production environment.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and ensure code quality
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Use TypeScript for type safety
- Write meaningful commit messages
- Add JSDoc comments for functions
- Update documentation for new features

### Pull Request Process
1. Ensure your code follows the project's coding standards
2. Update the README.md with details of changes if applicable
3. Add or update tests for new functionality
4. Ensure all tests pass
5. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 MERN API System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support & Contact

- **Documentation**: [API Documentation](http://localhost:5000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/mern-api-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mern-api-system/discussions)
- **Email**: support@mernapi.com

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [MongoDB](https://www.mongodb.com/) - Document database
- [Passport.js](http://www.passportjs.org/) - Authentication middleware
- [Swagger](https://swagger.io/) - API documentation tools
- [Razorpay](https://razorpay.com/) - Payment gateway
- [React](https://reactjs.org/) - User interface library

## 🔄 Changelog

### v1.0.0 (2024-01-01)
- Initial release
- JWT authentication system
- OAuth 2.0 integration
- Two-factor authentication
- Product and order management
- Payment gateway integration
- Comprehensive API documentation

---

**Built with ❤️ using the MERN stack**#   m e r n - a p i - s y s t e m  
 