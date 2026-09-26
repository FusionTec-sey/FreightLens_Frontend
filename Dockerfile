# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build argument passed by Coolify / Docker Compose
ARG REACT_APP_NETWORK
ENV REACT_APP_NETWORK=$REACT_APP_NETWORK

RUN npm run build

# Production serve stage using Nginx (~15MB RAM)
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4005

CMD ["nginx", "-g", "daemon off;"]