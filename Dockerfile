FROM node

RUN yarn global add anon-kafka-mirror

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    python \
    librdkafka-dev \
    libsasl2-dev \
    libsasl2-modules \
    libssl-dev \
    openssl

ENTRYPOINT [ "anon-kafka-mirror" ]
