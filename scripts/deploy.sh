#!/bin/bash
set -e

echo "Starting Deployment..."

# 1. Update kode dari Git
echo "Pulling latest code..."
git pull origin main

# 2. Build ulang container menggunakan docker-compose
echo "Building containers..."
docker-compose -f docker-compose.prod.yml build

# 3. Hentikan container lama & naikkan container baru di background
echo "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

# 4. Bersihkan images yang sudah tidak terpakai
echo "Cleaning up dangling images..."
docker image prune -f

echo "Deployment Successful!"
