FROM node:20-alpine

# Install required build tools and dependencies 
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache python3 make g++ git && \
    ln -sf python3 /usr/bin/python

# Create app directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=development
ENV PYTHON=/usr/bin/python3

# Install dependencies
COPY package*.json ./
RUN npm ci  # Ensures clean install for dev (bcrypt will compile)

# Copy source files
COPY . .

# Expose port for Next.js
EXPOSE 3000

# Start the dev server
CMD ["npm", "run", "dev"]
