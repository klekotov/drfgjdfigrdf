FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY index.js index.mjs pino-file.mjs pino-pretty.mjs pino-worker.mjs thread-stream-worker.mjs ./

EXPOSE 3000

CMD ["node", "index.js"]