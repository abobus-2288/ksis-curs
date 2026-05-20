FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Source code is mounted as a volume in docker-compose for hot reload
EXPOSE 3000

CMD ["npm", "run", "dev"]
