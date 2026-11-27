FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY . .
USER node
EXPOSE 4000
CMD ["sh", "-c", "node scripts/migrate.js && node src/server.js"]
