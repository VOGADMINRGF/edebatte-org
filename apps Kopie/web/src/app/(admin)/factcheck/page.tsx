import { runFactcheck } from "./actions";

export default async function Page() {
  const res = await runFactcheck("Beispielsatz …");
  return <pre>{JSON.stringify(res, null, 2)}</pre>;
}
