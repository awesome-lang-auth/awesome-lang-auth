# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app

# Copia file dipendenze
COPY package*.json ./
RUN npm ci

# Copia il codice
COPY ./ .

# Dichiariamo gli ARG che il compose passerà
ARG AI_LLM_ENDPOINT
ARG AI_MODEL
ARG AI_TEMPERATURE
ARG AI_MAX_TOKENS
ARG ACCOUNT_API_URL

# Li trasformiamo in ENV così 'npm run build' può leggerli
ENV AI_LLM_ENDPOINT=$AI_LLM_ENDPOINT \
    AI_MODEL=$AI_MODEL \
    AI_TEMPERATURE=$AI_TEMPERATURE \
    AI_MAX_TOKENS=$AI_MAX_TOKENS \
    ACCOUNT_API_URL=$ACCOUNT_API_URL \
    NODE_ENV=production

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
# Sostituisce la conf default: /docs/ dava 403 e i 404 usavano la pagina di nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
