import { Kafka } from "kafkajs";
const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKERS || "localhost:19092"] });
const consumer = kafka.consumer({ groupId: "vog-local-dev" });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: "vog.events", fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({ topic, partition, key: message.key?.toString(), value: message.value?.toString() });
    },
  });
}
main().catch(console.error);
