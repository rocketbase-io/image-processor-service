FROM node

COPY dist /
COPY package.json /
COPY package-lock.json /

ENV PORT=3000 MAX_OPS=20
RUN ["npm", "ci"]
CMD ["node", "index"]
