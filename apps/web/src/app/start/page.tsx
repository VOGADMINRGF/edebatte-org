import LandingStart from "./LandingStart";
import { getGeoFromHeaders } from "@/lib/geo/getGeoFromHeaders";
import { getNeighbors } from "@/lib/geo/neighbors";
import { selectExamples } from "@/lib/examples/selectExamples";
import type { BucketBlock } from "@/components/landing/ExamplesBackdrop";

function yyyymmdd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export default async function StartPage() {
  const geo = await getGeoFromHeaders();
  const neighbors = getNeighbors(geo.country);

  const seedKey = `${geo.country || "XX"}-${geo.region || "NA"}-${yyyymmdd()}`;

  const world = selectExamples({ bucket: "WORLD", limit: 10, seedKey });
  const eu = selectExamples({ bucket: "EU", limit: 10, seedKey });

  const neighborItems = selectExamples({
    bucket: "NEIGHBORS",
    country: geo.country,
    neighbors,
    limit: 10,
    seedKey,
  });

  const homeCountry = selectExamples({
    bucket: "HOME_COUNTRY",
    country: geo.country,
    limit: 10,
    seedKey,
  });

  const homeRegion = selectExamples({
    bucket: "HOME_REGION",
    country: geo.country,
    region: geo.region,
    limit: 10,
    seedKey,
  });

  // Reduced rows (as discussed)
  const blocks: BucketBlock[] = [
    { label: "WORLD", items: world },
    { label: "EU", items: eu },
    { label: "NACHBARLÄNDER", items: neighborItems },
    { label: "HEIMATLAND", items: homeCountry },
    { label: "HEIMATREGION", items: homeRegion },
  ];

  return <LandingStart blocks={blocks} geo={geo} />;
}
