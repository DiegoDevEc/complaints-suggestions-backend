# -------- Stage 1: Build --------
FROM node:20.19.0 AS builder

WORKDIR /app

# Copiar dependencias e instalar
COPY package*.json ./
RUN npm ci

# Copiar el resto del código
COPY . .

# Compilar NestJS
RUN npm run build

# -------- Stage 2: Runtime --------
FROM node:20.19.0-slim

WORKDIR /app

# Copiar solo lo necesario de la build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copiar recursos estáticos a dist
COPY --from=builder /app/src/img ./dist/img
COPY --from=builder /app/src/fonts ./dist/fonts
# (Quitamos la línea de public porque no existe en backend)

# Instalar solo dependencias necesarias para producción
RUN npm ci --omit=dev

# Puerto expuesto
EXPOSE 3000

# Comando para iniciar la app
CMD ["node", "dist/main.js"]
