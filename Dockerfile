FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npx playwright install chromium --with-deps

COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "api"]