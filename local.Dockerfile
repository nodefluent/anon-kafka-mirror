FROM node
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/app;
COPY package.json yarn.lock /usr/src/app/
RUN yarn global add nodemon; yarn install;
COPY . /usr/src/app
