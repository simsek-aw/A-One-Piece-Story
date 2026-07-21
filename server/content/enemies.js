// Gegner-Vorlagen fürs Kampfsystem. Werte skalieren im Kampf mit dem Level.
// Felder:
//   hp, atk (Angriffsbonus), def (Verteidigung), dmg (Grundschaden)
//   xp (Belohnung), beri (Beute), bountyOnDefeat/heatOnDefeat (Konsequenzen,
//   wenn man z.B. die Marine besiegt -> man wird zum gesuchten Gesetzlosen)

export const ENEMIES = {
  bandit: {
    id: "bandit", name: "Straßenbandit", hp: 18, atk: 3, def: 1, dmg: 5,
    xp: 18, beri: 15, bountyOnDefeat: 0, heatOnDefeat: 0,
  },
  wildtier: {
    id: "wildtier", name: "wildes Tier", hp: 22, atk: 5, def: 1, dmg: 7,
    xp: 22, beri: 0, bountyOnDefeat: 0, heatOnDefeat: 0,
  },
  rivale: {
    id: "rivale", name: "Rivalisierender Pirat", hp: 28, atk: 5, def: 2, dmg: 7,
    xp: 32, beri: 40, bountyOnDefeat: 800000, heatOnDefeat: 3,
  },
  kopfgeldjaeger: {
    id: "kopfgeldjaeger", name: "Kopfgeldjäger", hp: 30, atk: 6, def: 2, dmg: 8,
    xp: 40, beri: 60, bountyOnDefeat: 500000, heatOnDefeat: 2,
  },
  marine_soldat: {
    id: "marine_soldat", name: "Marine-Soldat", hp: 24, atk: 4, def: 2, dmg: 6,
    xp: 25, beri: 20, bountyOnDefeat: 700000, heatOnDefeat: 12,
  },
  marine_offizier: {
    id: "marine_offizier", name: "Marine-Offizier", hp: 42, atk: 6, def: 3, dmg: 9,
    xp: 55, beri: 80, bountyOnDefeat: 2500000, heatOnDefeat: 18,
  },
};

export function listEnemies() {
  return Object.values(ENEMIES).map((e) => ({ id: e.id, name: e.name }));
}

export function enemyTemplate(kind) {
  return ENEMIES[kind] || ENEMIES.bandit;
}
