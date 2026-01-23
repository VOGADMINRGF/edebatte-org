import { Kafka } from "kafkajs";

const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKERS || "localhost:19092"] });
const producer = kafka.producer();

async function main() {
  await producer.connect();
  await producer.send({
    topic: "vog.events",
    messages: [{ key: "key1", value: JSON.stringify({ ping: true, at: new Date().toISOString() }) }],
  });
  await producer.disconnect();
  console.log("Produced 1 message to vog.events");
}
main().catch(console.error);
