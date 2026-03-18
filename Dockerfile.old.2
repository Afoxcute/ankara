FROM node:20-alpine

WORKDIR /usr/src/app

# STEP 1 Debug: Show build context contents
RUN echo "=== Build Context Contents ==="
RUN ls -la

# STEP 2 Copy package.json
COPY backend/package.json ./

# STEP 3 Debug: Show after package.json copy
RUN echo "=== After package.json copy ==="
RUN ls -la

# STEP 4 Install dependencies
RUN npm install --include=dev

# STEP 5 Fix permissions on node_modules binaries
RUN echo "=== Fixing node_modules permissions ===" && \
    chmod -R 755 node_modules/.bin && \
    ls -la node_modules/.bin | head -10

# STEP 6 Copy backend directory
COPY backend/ ./

# STEP 7 Debug: Show final contents
RUN echo "=== Final Contents ===" && \
    ls -la && \
    echo "=== Checking ts-node ===" && \
    ls -la node_modules/.bin/ts-node || echo "ts-node not found"

# STEP 8 Ensure ts-node is installed and executable
RUN npm install -g ts-node typescript && \
    chmod +x /usr/local/bin/ts-node

EXPOSE 8080

# Use npx with transpile-only flag to skip type checking (faster startup)
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
