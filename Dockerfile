# -------- Stage 1: Build --------
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps for build)
RUN npm install

# Copy source code
COPY . .

# Build project
RUN npm run build

# -------- Stage 2: Run --------
FROM node:20-slim AS runner

# Set working directory
WORKDIR /app

# Copy only production deps
COPY package*.json ./
RUN npm install --only=production

# Copy build output from builder
COPY --from=builder /app/dist ./dist

# Copy other needed files (like migrations, public assets, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Set environment variable (Coolify puede sobreescribir esto)
ENV NODE_ENV=production

# Run app
CMD ["node", "dist/main"]
