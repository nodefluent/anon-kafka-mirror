# anon-kafka-mirror - consume, anon, produce

[![npm version](https://badge.fury.io/js/anon-kafka-mirror.svg)](https://badge.fury.io/js/anon-kafka-mirror)
[![Docker Repository on Quay](https://quay.io/repository/nodefluent/anon-kafka-mirror/status "Docker Repository on Quay")](https://quay.io/repository/nodefluent/anon-kafka-mirror)

## Intro

Anonymize Kafka topics while mirroring them on the fly.
Just pass a config file describing your topics and schema (and Kafka cluster connections) and start the service / container.

## Example

- Start docker compose setup: `yarn setup`
- Produce some message to **input** topic: `echo '{"test": 2, "abc":"cba", "id": "1", "mail": "real@email.com", "a":["test"], "b":[{"c":0},{"d":1}, {"c":1}], "z": [["test"],[]], "d": [[{"e": 0}, {"ex": 1}]], "f": [{"g": "g", "t": 1},"test"], "y": [1,2,3,4,5], "x":[{"x": 1, "y": 2}, {"g":2}] }' | kafka-console-producer --topic input --broker-list localhost:9092`
- Show output message in **output topic** : `kafka-console-consumer --topic output --from-beginning --bootstrap-server localhost:9092`

### Maintainer

Build with :heart: :pizza: and :coffee: by [nodefluent](https://github.com/nodefluent)
