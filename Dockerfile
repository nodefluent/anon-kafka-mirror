FROM node

RUN yarn global add anon-kafka-mirror

ENTRYPOINT [ "anon-kafka-mirror" ]
