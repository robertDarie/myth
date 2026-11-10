// Original v0.43 Scout Camp tuning. These numbers are not a verified Rise of Kingdoms table.
// RoK's camp adds scout marches, speed and exploration range; the levels below are this prototype's values.
export const SCOUT_CAMP_LEVELS = [
  { scouts: 0, speed: 0, radius: 0, surveySeconds: 0, autoSectors: 0 },
  { scouts: 1, speed: 7, radius: 9, surveySeconds: 0.8, autoSectors: 2 },
  { scouts: 1, speed: 8.5, radius: 10, surveySeconds: 0.7, autoSectors: 3 },
  { scouts: 2, speed: 10, radius: 12, surveySeconds: 0.55, autoSectors: 4 },
  { scouts: 2, speed: 11.5, radius: 13, surveySeconds: 0.4, autoSectors: 6 },
  { scouts: 3, speed: 13, radius: 15, surveySeconds: 0.25, autoSectors: 8 }
];
export function scoutProfile(level) {
  const index = Number.isInteger(level) && level >= 0 && level < SCOUT_CAMP_LEVELS.length ? level : 0;
  return SCOUT_CAMP_LEVELS[index];
}
export function scoutCampCard(level) {
  const current = scoutProfile(level), next = level < 5 ? scoutProfile(level + 1) : null;
  return {
    scouts: current.scouts, speed: current.speed, radius: current.radius, surveySeconds: current.surveySeconds, autoSectors: current.autoSectors,
    hasNext: !!next,
    nextScouts: next?.scouts ?? current.scouts, nextSpeed: next?.speed ?? current.speed, nextRadius: next?.radius ?? current.radius,
    nextSurveySeconds: next?.surveySeconds ?? current.surveySeconds, nextAutoSectors: next?.autoSectors ?? current.autoSectors
  };
}
