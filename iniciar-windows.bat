@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title NEON LIQUOR

echo.
echo ===============================================
echo   NEON LIQUOR - inicio automatico en Windows
echo ===============================================
echo.

rem --- 1. Node.js ---
where node >nul 2>nul
if errorlevel 1 goto :nonode
for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
if !NODE_MAJOR! LSS 20 goto :oldnode
echo [OK] Node !NODE_VERSION!

rem --- 2. Docker ---
set USE_DOCKER=1
where docker >nul 2>nul
if errorlevel 1 set USE_DOCKER=0
if "!USE_DOCKER!"=="0" echo [i] No se encontro Docker. Se usara el PostgreSQL configurado en server\.env
if "!USE_DOCKER!"=="0" goto :deps
docker info >nul 2>nul
if errorlevel 1 goto :dockeroff
echo [OK] Docker esta encendido

:deps
rem --- 3. Dependencias ---
if exist "node_modules" goto :config
echo.
echo Instalando dependencias, la primera vez tarda unos minutos...
call npm install
if errorlevel 1 goto :fail

:config
echo [OK] Dependencias instaladas
rem --- 4. Configuracion ---
if exist "server\.env" goto :db
copy "server\.env.example" "server\.env" >nul
echo [OK] Se creo server\.env

:db
rem --- 5. PostgreSQL con Docker ---
if "!USE_DOCKER!"=="0" goto :migrate
echo.
echo Encendiendo PostgreSQL...
call npm run db:up
if errorlevel 1 goto :fail
set TRIES=0

:waitdb
docker exec neon-liquor-db pg_isready -U neon -d neon_liquor >nul 2>nul
if not errorlevel 1 goto :dbready
set /a TRIES+=1
if !TRIES! GEQ 30 goto :dbtimeout
timeout /t 2 /nobreak >nul
goto :waitdb

:dbready
echo [OK] PostgreSQL listo

:migrate
rem --- 6. Tablas y datos ---
echo.
echo Preparando la base de datos...
call npm run db:deploy
if errorlevel 1 goto :fail
call npm run db:seed
if errorlevel 1 goto :fail

echo.
echo -----------------------------------------------------------------
echo  Si arriba aparece "CUENTA DE ADMINISTRADOR CREADA", anota la
echo  contrasena: solo se muestra una vez.
echo -----------------------------------------------------------------
pause

rem --- 7. Compilar e iniciar en http://localhost ---
echo.
echo Compilando la tienda...
call npm run build
if errorlevel 1 goto :fail

rem Se usa el puerto 80 (http://localhost). Si esta ocupado, el 4000.
set PORT=80
netstat -ano | findstr /c:"0.0.0.0:80 " /c:"[::]:80 " /c:"127.0.0.1:80 " >nul
if not errorlevel 1 set PORT=4000
set URL=http://localhost
if not "!PORT!"=="80" set URL=http://localhost:!PORT!
set NODE_ENV=production
set APP_URL=!URL!
set COOKIE_SECURE=false

echo.
echo ===============================================
echo   Tienda: !URL!
echo   Panel:  !URL!/admin
echo   NO cierres esta ventana mientras uses la tienda.
echo ===============================================
echo.
start "" cmd /c "timeout /t 5 /nobreak >nul & start !URL!"
call npm start
if errorlevel 1 goto :fail
goto :eof

:nonode
echo [X] No se encontro Node.js.
echo     Instala la version LTS desde https://nodejs.org, cierra esta ventana y vuelve a abrir este archivo.
goto :fail

:oldnode
echo [X] Tienes Node !NODE_VERSION!. Se necesita la version 20.19 o superior.
echo     Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
goto :fail

:dockeroff
echo [X] Docker Desktop no esta encendido.
echo     Abrelo, espera a que diga "Engine running" y vuelve a abrir este archivo.
goto :fail

:dbtimeout
echo [X] La base de datos no respondio a tiempo. Revisa Docker Desktop.
goto :fail

:fail
echo.
echo *** No se pudo iniciar. Toma una captura de esta ventana y enviala. ***
pause
exit /b 1
