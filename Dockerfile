FROM node:current-alpine

RUN apk add python make gcc g++

WORKDIR /usr/src/files.mrnld.net

COPY package*.json ./

RUN npm install

COPY . .

WORKDIR /usr/src/files.mrnld.net/db

RUN [ "sqlite3", "files.db", ".read ../schema.sql"]

EXPOSE 3000
CMD [ "node", "index.js" ]