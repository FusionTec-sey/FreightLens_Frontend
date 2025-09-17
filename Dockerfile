# Stage 1: Build the React app
FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm run build

EXPOSE 3000

CMD ["npm", "start"]