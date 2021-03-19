FROM node:current-alpine

RUN apk add python make gcc g++ sqlite

WORKDIR /usr/src/files.mrnld.net

COPY package*.json ./

RUN npm install

COPY . .

WORKDIR /usr/src/files.mrnld.net/db

RUN [ "sqlite3", "files.db", ".read ../schema.sql"]
RUN [ "npm", "install", "-g", "pm2"]

WORKDIR /usr/src/files.mrnld.net

EXPOSE 3000
CMD [ "pm2", "start", "index.js", "--name", "files.mrnld.net" ]