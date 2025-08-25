# Security Notes

- Do not hardcode secrets. Set environment variables:
  - MONGODB_URI
  - JWT_SECRET
  - CORS_ORIGIN
- Rate limiting enabled for `/api/*`.
- Helmet and XSS clean enabled.
- Use HTTPS and secure cookies in production.
- For horizontal scaling, use a shared Socket.IO adapter and shared state (e.g., Redis). 
