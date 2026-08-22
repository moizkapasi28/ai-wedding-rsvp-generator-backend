FROM node:22-slim

WORKDIR /app

COPY package*.json ./
# Install all dependencies (including dev) so we can build TS
RUN npm install

# Install Redis
RUN apt-get update && apt-get install -y redis-server && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npx prisma generate

# Build the project
RUN npm run build

EXPOSE 3000

COPY start.sh ./
RUN chmod +x start.sh

# Adjust permissions so the node user can write to Redis and App directories
RUN mkdir -p /var/log/redis /var/lib/redis /run/redis /etc/redis && \
    chown -R node:node /app /var/log/redis /var/lib/redis /run/redis /etc/redis

# Switch to the non-root 'node' user
USER node

CMD ["/bin/bash", "start.sh"]