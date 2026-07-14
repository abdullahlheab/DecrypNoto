FROM node:24-alpine
WORKDIR /app
COPY server.js ./
COPY public ./public
ENV STATE_FILE=/data/game-state.json
EXPOSE 4321
CMD ["node", "server.js"]
