FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose ports for both server and client  
EXPOSE 3006 5173

# Start in development mode with both server and client
CMD ["npm", "run", "dev"]