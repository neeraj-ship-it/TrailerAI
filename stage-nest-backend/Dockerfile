 # Stage 1: Builder
 FROM node:22-alpine3.19 AS builder

 WORKDIR /app

 # Copy dependency files first for caching
 COPY package*.json ./

 # Install ALL dependencies (including devDependencies)
 RUN npm ci --include=dev

 # Copy source code
 COPY . .

 # Build production artifacts
 RUN npm run build

 # Stage 2: Production image
 FROM node:22-alpine3.19

 WORKDIR /app

 # Install ONLY production dependencies
 COPY --from=builder /app/package*.json ./
 
 RUN npm ci --production --ignore-scripts

 # Copy built artifacts from builder
 COPY --from=builder /app/dist ./dist

 # Add any required runtime files (e.g., .env, assets)
 COPY --from=builder /app/.env ./.env
 # COPY --from=builder /app/public ./public

 # Configure Node.js memory limits and enable production optimizations
 CMD ["npm", "run", "start:prod"]