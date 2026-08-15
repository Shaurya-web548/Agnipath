// Advisory source per scenario. The Uttarakhand scenario keeps the
// hand-written advisories; other scenarios use a template generator driven
// by the same simulation math, in both English and Hindi. Everything is
// available offline.

import { fallbackAdvisories, type Advisory, type Urgency } from "./fallbackAdvisories";
import {
  type Scenario,
  coneReachKm,
  shelterIsSafe,
  roadIsOpen,
  bearingToCompass,
} from "./scenarios";

const COMPASS_HI: Record<string, string> = {
  N: "उत्तर", NNE: "उत्तर-उत्तर-पूर्व", NE: "उत्तर-पूर्व", ENE: "पूर्व-उत्तर-पूर्व",
  E: "पूर्व", ESE: "पूर्व-दक्षिण-पूर्व", SE: "दक्षिण-पूर्व", SSE: "दक्षिण-दक्षिण-पूर्व",
  S: "दक्षिण", SSW: "दक्षिण-दक्षिण-पश्चिम", SW: "दक्षिण-पश्चिम", WSW: "पश्चिम-दक्षिण-पश्चिम",
  W: "पश्चिम", WNW: "पश्चिम-उत्तर-पश्चिम", NW: "उत्तर-पश्चिम", NNW: "उत्तर-उत्तर-पश्चिम",
};

const listEn = (names: string[]) =>
  names.length <= 1 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names.at(-1);
const listHi = (names: string[]) =>
  names.length <= 1 ? names.join("") : names.slice(0, -1).join(", ") + " और " + names.at(-1);

function generateForHour(s: Scenario, hour: number): Advisory {
  const compass = bearingToCompass(s.wind.bearingDeg);
  const compassHi = COMPASS_HI[compass];
  const reach = coneReachKm(s, hour);
  const closedShelters = s.shelters.filter((x) => !shelterIsSafe(s, x, hour));
  const safeShelters = s.shelters.filter((x) => shelterIsSafe(s, x, hour));
  const newlyClosed = s.shelters.filter(
    (x) => !shelterIsSafe(s, x, hour) && (hour === 0 || shelterIsSafe(s, x, hour - 1))
  );
  const closingNext = s.shelters.filter(
    (x) => shelterIsSafe(s, x, hour) && !shelterIsSafe(s, x, hour + 1)
  );
  const closedRoads = s.roads.filter((x) => !roadIsOpen(s, x, hour));

  const urgency: Urgency =
    closedShelters.length > 0
      ? "EVACUATE"
      : closingNext.length > 0 || closedRoads.length > 0
        ? "WARNING"
        : "ADVISORY";

  const headline =
    hour === 0
      ? `Fire detected near ${s.region.split(",")[0]}`
      : newlyClosed.length > 0
        ? `${newlyClosed[0].name} inside danger zone`
        : closingNext.length > 0
          ? `Danger zone nearing ${closingNext[0].name}`
          : closedShelters.length > 0
            ? `Danger zone holding ${closedShelters.length} shelter${closedShelters.length > 1 ? "s" : ""} closed`
            : `Fire spreading ${compass}, shelters safe`;

  const en: string[] = [];
  const hi: string[] = [];

  if (hour === 0) {
    en.push(
      `A fire has been detected near ${s.region} at ${s.fire.detectedAt} (${s.fire.confidence} confidence). Wind is pushing ${compass} at ${s.wind.speedKmh} km/h.`
    );
    hi.push(
      `${s.region} के पास ${s.fire.detectedAt} बजे आग का पता चला है। हवा ${s.wind.speedKmh} किमी/घंटा की गति से ${compassHi} दिशा में बह रही है।`
    );
  } else {
    en.push(
      `At hour ${hour}, the projected danger zone reaches about ${reach.toFixed(1)} km ${compass} of the fire point.`
    );
    hi.push(
      `${hour} घंटे में अनुमानित खतरे का क्षेत्र आग के बिंदु से लगभग ${reach.toFixed(1)} किमी ${compassHi} तक पहुँच गया है।`
    );
  }

  if (newlyClosed.length > 0) {
    en.push(
      `${listEn(newlyClosed.map((x) => x.name))} ${newlyClosed.length > 1 ? "are" : "is"} now inside the danger zone and closed. Anyone in that area must move immediately.`
    );
    hi.push(
      `${listHi(newlyClosed.map((x) => x.name))} अब खतरे के क्षेत्र में ${newlyClosed.length > 1 ? "हैं" : "है"} और बंद ${newlyClosed.length > 1 ? "हैं" : "है"}। उस क्षेत्र के सभी लोग तुरंत निकलें।`
    );
  } else if (closedShelters.length > 0) {
    en.push(
      `${listEn(closedShelters.map((x) => x.name))} remain${closedShelters.length > 1 ? "" : "s"} closed.`
    );
    hi.push(`${listHi(closedShelters.map((x) => x.name))} बंद ${closedShelters.length > 1 ? "हैं" : "है"}।`);
  }

  if (closingNext.length > 0) {
    en.push(
      `${listEn(closingNext.map((x) => x.name))} is expected to fall inside the danger zone within the hour — do not travel there.`
    );
    hi.push(
      `${listHi(closingNext.map((x) => x.name))} के एक घंटे के भीतर खतरे के क्षेत्र में आने की आशंका है — वहाँ यात्रा न करें।`
    );
  }

  if (closedRoads.length > 0) {
    en.push(`Closed roads: ${listEn(closedRoads.map((x) => x.name))}.`);
    hi.push(`बंद मार्ग: ${listHi(closedRoads.map((x) => x.name))}।`);
  }

  if (safeShelters.length > 0) {
    en.push(`Safe shelters: ${listEn(safeShelters.map((x) => x.name))}.`);
    hi.push(`सुरक्षित आश्रय: ${listHi(safeShelters.map((x) => x.name))}।`);
  }

  en.push(
    hour === 0
      ? "Residents should stay alert and keep evacuation kits ready."
      : "Follow instructions from district authorities."
  );
  hi.push(
    hour === 0
      ? "निवासी सतर्क रहें और आपातकालीन किट तैयार रखें।"
      : "जिला प्रशासन के निर्देशों का पालन करें।"
  );

  return {
    headline,
    advisory_en: en.join(" "),
    advisory_hi: hi.join(" "),
    urgency,
  };
}

const cache = new Map<string, Advisory[]>();

/** 7 advisories (H+0..H+6) for a scenario; hand-written for Uttarakhand. */
export function advisoriesFor(s: Scenario): Advisory[] {
  if (s.id === "uttarakhand") return fallbackAdvisories;
  let list = cache.get(s.id);
  if (!list) {
    list = Array.from({ length: 7 }, (_, h) => generateForHour(s, h));
    cache.set(s.id, list);
  }
  return list;
}
