# anon-kafka-mirror - consume, anon, produce
[![npm version](https://badge.fury.io/js/anon-kafka-mirror.svg)](https://badge.fury.io/js/anon-kafka-mirror)
[![Docker Repository on Quay](https://quay.io/repository/nodefluent/anon-kafka-mirror/status "Docker Repository on Quay")](https://quay.io/repository/nodefluent/anon-kafka-mirror)
### TODO

-[] Better documentation

### Example

- Start docker compose setup: `docker-compose up -d`
- Produce some message to **input** topic: `echo '{"test": 2, "abc":"cba", "id": "1", "mail": "real@email.com", "number": 0}' | kafka-console-producer --topic input --broker-list localhost:9092`
- Show output message in **output topic** : `kafka-console-consumer --topic output --from-beginning --bootstrap-server localhost:9092`

### Maintainer

Build with :heart: :pizza: and :coffee: by [nodefluent](https://github.com/nodefluent)


