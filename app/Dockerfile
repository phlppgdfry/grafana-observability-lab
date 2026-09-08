FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY app/ ./app/
COPY telemetry/ ./telemetry/
USER node
ENV HOST=0.0.0.0 PORT=4310
EXPOSE 4310
CMD ["node", "app/server.mjs"]
