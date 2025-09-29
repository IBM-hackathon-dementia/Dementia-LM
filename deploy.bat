@echo off
echo ============================================
echo   E-umm Cloudflare Deployment Script
echo ============================================
echo.

echo [1/4] Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo ✅ Frontend built successfully
echo.

echo [2/4] Deploying Backend (Cloudflare Worker)...
cd eume-api
call wrangler deploy
if %errorlevel% neq 0 (
    echo ERROR: Backend deployment failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Backend deployed successfully
cd ..
echo.

echo [3/4] Initializing D1 Database...
cd eume-api
call wrangler d1 execute eume-database --file=schema.sql --remote
if %errorlevel% neq 0 (
    echo WARNING: Database initialization failed or already exists
)
echo ✅ Database ready
cd ..
echo.

echo [4/4] Deploying Frontend (Cloudflare Pages)...
call wrangler pages deploy dist --project-name=e-umm-frontend --compatibility-date=2024-09-01
if %errorlevel% neq 0 (
    echo ERROR: Frontend deployment failed
    pause
    exit /b 1
)
echo ✅ Frontend deployed successfully
echo.

echo ============================================
echo   Deployment Complete! 🎉
echo ============================================
echo.
echo 🌐 Frontend: https://e-umm-frontend.pages.dev
echo 🔧 Backend:  https://eume-api.hwjinfo.workers.dev
echo 💾 Database: Cloudflare D1 (eume-database)
echo.
echo Test your deployment:
echo curl https://eume-api.hwjinfo.workers.dev/health
echo.
pause