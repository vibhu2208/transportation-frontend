# Vendor Booking System - Deployment Guide

This guide explains how to deploy and manage both development and production environments.

## Environment Setup

### Development Environment
- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:3001`
- **Features**: Development badge, detailed logging, hot reload

### Production Environment
- **Frontend**: `https://transportation-frontend-six.vercel.app/`
- **Backend**: Your Render.com URL
- **Features**: Optimized build, production logging, no development indicators

## Quick Start Commands

### Development
```bash
# Start backend (from backend directory)
npm run start:dev

# Start frontend (from frontend directory)
npm run dev
```

### Production Deployment
```bash
# Deploy frontend to production
npm run deploy:prod

# Backend will be deployed automatically via Render.com when you push to main branch
```

## Environment Variables

### Frontend (.env.local for development)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_APP_NAME="Vendor Booking System (Dev)"
NEXT_PUBLIC_APP_VERSION="1.0.0-dev"
```

### Frontend (.env.production for production)
```env
NEXT_PUBLIC_API_URL=https://your-backend-render-url.onrender.com
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_APP_NAME="Vendor Booking System"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

### Backend (Render.com Environment Variables)
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL`
- `WEBHOOK_VERIFY_TOKEN`
- `FRONTEND_URL=https://transportation-frontend-six.vercel.app`

## Automatic Environment Switching

The system automatically detects the environment based on:

1. **Environment Variables**: `NEXT_PUBLIC_ENV`
2. **API URL**: Different endpoints for dev/prod
3. **Visual Indicators**: Development badge only shows in dev
4. **Logging**: Detailed logs in development, minimal in production

## Deployment Scripts

### Development Deployment
```bash
npm run deploy:dev
```
- Sets up development environment
- Connects to local backend
- Starts development server

### Production Deployment
```bash
npm run deploy:prod
```
- Sets up production environment
- Connects to production backend
- Deploys to Vercel

## Manual Environment Switching

If you need to manually switch environments:

1. **Update `.env.local`** with the desired backend URL
2. **Set `NEXT_PUBLIC_ENV`** to `development` or `production`
3. **Restart the development server**

## CI/CD Integration

### Backend (Render.com)
- Auto-deploys on push to main branch
- Uses `Dockerfile` and `render.yaml` for configuration
- Health checks at `/health` endpoint

### Frontend (Vercel)
- Auto-deploys on push to main branch
- Uses `vercel.json` for configuration
- Environment variables set in Vercel dashboard

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend allows your frontend URL
2. **API Connection**: Check API URLs in environment variables
3. **Build Failures**: Verify all environment variables are set
4. **Health Checks**: Ensure `/health` endpoint is accessible

### Debug Mode

Development environment includes:
- Console logging for all API requests
- Environment badge in UI
- Detailed error messages
- Hot module replacement

## Next Steps

1. Update `your-backend-render-url.onrender.com` with your actual Render URL
2. Set up environment variables in Vercel dashboard
3. Configure webhook in Render.com for auto-deployment
4. Test both environments before going live
