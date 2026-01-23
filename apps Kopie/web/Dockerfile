FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspaces --if-present || npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Non-root user
RUN addgroup -g 1001 nodegrp && adduser -S -u 1001 nodeusr -G nodegrp
COPY --from=builder /app ./
USER nodeusr
EXPOSE 3000
# Read-only FS; tmp as writable
VOLUME ["/tmp"]
CMD ["npm","run","start"]
