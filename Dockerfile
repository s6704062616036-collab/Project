FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ARG VITE_DATA_MODE=database
ARG VITE_FORCE_DATA_MODE=true
ARG VITE_HIDE_DATA_MODE_SWITCH=true
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DATA_MODE=$VITE_DATA_MODE
ENV VITE_FORCE_DATA_MODE=$VITE_FORCE_DATA_MODE
ENV VITE_HIDE_DATA_MODE_SWITCH=$VITE_HIDE_DATA_MODE_SWITCH

RUN npm run build

FROM nginx:1.27-alpine

COPY .docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
