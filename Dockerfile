# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app

# Copia file dipendenze
COPY package*.json ./
RUN npm ci

# Copia il codice
COPY ./ .

ENV NODE_ENV=production

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
# Sostituisce la conf default: /docs/ dava 403 e i 404 usavano la pagina di nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
