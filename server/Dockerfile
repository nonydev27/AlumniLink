FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY . .
USER node
EXPOSE 4000
# Migrations are a one-shot service in compose; a single image serves API and workers.
CMD ["node", "src/server.js"]
