import { backfillPriorResearchTopics } from "../../features/research/topicHandoff";

const results = await backfillPriorResearchTopics();

console.log(
  JSON.stringify(
    {
      ok: true,
      topics: results.length,
      results,
    },
    null,
    2,
  ),
);
