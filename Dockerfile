FROM node:20-alpine
WORKDIR /task
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3001
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
