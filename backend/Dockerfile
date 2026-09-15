FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

RUN mkdir -p data logs

EXPOSE 3210

CMD ["node", "src/index.js"]
