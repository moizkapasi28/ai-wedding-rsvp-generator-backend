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

EXPOSE 5000

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]