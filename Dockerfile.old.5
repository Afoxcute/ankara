FROM node:20-alpine

# Install OpenSSL 1.1 compatibility for Prisma
RUN apk add --no-cache openssl1.1-compat

WORKDIR /usr/src/app

# STEP 1 Debug: Show build context contents
RUN echo "=== Build Context Contents ==="
RUN ls -la

# STEP 2 Copy package.json
COPY backend/package.json ./

# STEP 3 Debug: Show after package.json copy
RUN echo "=== After package.json copy ==="
RUN ls -la

# STEP 4 Install dependencies (including dotenv)
RUN npm install --include=dev && \
    npm install dotenv

# STEP 5 Fix permissions on node_modules binaries
RUN echo "=== Fixing node_modules permissions ===" && \
    chmod -R 755 node_modules/.bin && \
    ls -la node_modules/.bin | head -10

# STEP 6 Copy backend directory (including prisma schema)
COPY backend/ ./

# STEP 6.5 Generate Prisma Client
RUN echo "=== Generating Prisma Client ===" && \
    npx prisma generate && \
    echo "✅ Prisma Client generated successfully"

# STEP 7 Debug: Show final contents
RUN echo "=== Final Contents ===" && \
    ls -la && \
    echo "=== Checking ts-node ===" && \
    ls -la node_modules/.bin/ts-node || echo "ts-node not found"

# STEP 8 Ensure ts-node is installed and executable
RUN npm install -g ts-node typescript && \
    chmod +x /usr/local/bin/ts-node

EXPOSE 8080

# Run the application with dotenv preloaded
CMD ["npx", "ts-node", "--transpile-only", "-r", "dotenv/config", "src/index.ts"]
