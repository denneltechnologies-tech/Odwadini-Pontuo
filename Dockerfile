FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
