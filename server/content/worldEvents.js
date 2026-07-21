// Weltgeschehen für die "News-Möwe" (Zeitungssystem). Ereignisse im Kanon rund
// um den Spieler — global und regional. Verankert an In-Game-Tagen ab Rogers
// Hinrichtung. Bewusst lore-nah, aber eigenständig formuliert.
//
// scope: "weltweit" | "grand_line" | "east_blue"

export const WORLD_EVENTS = [
  { day: 1, scope: "weltweit", headline: "Der Piratenkönig ist tot", body: "Gol D. Roger wurde in Loguetown hingerichtet. Seine letzten Worte haben ein Feuer entfacht — überall brechen Menschen zur See auf." },
  { day: 3, scope: "east_blue", headline: "Ansturm auf die Häfen", body: "In allen vier Blues rüsten frische Crews ihre Schiffe. Werften und Waffenschmiede kommen kaum nach." },
  { day: 10, scope: "weltweit", headline: "Marine verstärkt Patrouillen", body: "Das Hauptquartier ordnet verschärfte Kontrollen an. Wer auffällt, landet schnell auf einem Steckbrief." },
  { day: 25, scope: "grand_line", headline: "Weißbart weiterhin unangefochten", body: "Berichte bestätigen: Edward Newgates Flotte kontrolliert weite Teile ihrer Gewässer. Niemand wagt den offenen Konflikt.", crews: ["whitebeard"] },
  { day: 40, scope: "grand_line", headline: "Eine Kaiserin sammelt Familie", body: "Aus dem Neuen Land heißt es, eine mächtige Piratin nehme immer mehr Untergebene in ihre 'Familie' auf.", crews: ["big_mom"] },
  { day: 60, scope: "weltweit", headline: "Kopfgelder steigen", body: "Die Weltregierung hebt Kopfgelder für aufstrebende Piraten an — das Zeitalter wird gefährlicher." },
  { day: 90, scope: "grand_line", headline: "Gerücht: Ein Strohhut auf der Grand Line", body: "Man munkelt von einem jungen Kapitän, der einst zu Rogers Crew gehörte — mit rotem Haar und einem Strohhut." },
  { day: 120, scope: "weltweit", headline: "Riesen aus Elbaf gesichtet", body: "Krieger von der Insel der Riesen sollen wieder zur See fahren. Wer ihnen begegnet, berichtet von Ehrfurcht und Furcht zugleich.", crews: ["giants"] },
  { day: 160, scope: "grand_line", headline: "Eine Bestie im Neuen Land", body: "Von einem scheinbar unbesiegbaren Piraten ist die Rede, der ganze Inseln unterwirft.", crews: ["kaido"] },
  { day: 200, scope: "weltweit", headline: "Die Regierung schweigt über die Leere", body: "Gelehrte, die zu einem gewissen 'fehlenden Jahrhundert' forschen, verschwinden. Offiziell gibt es 'nichts zu berichten'." },
];

// Regionale Kurzmeldung passend zum aktuellen Ort (Farbe/Immersion).
export const REGIONAL_FLAVOR = {
  loguetown: "Loguetown: Kopfgeldjäger und frische Piraten drängen sich am Hinrichtungsplatz.",
  shells_town: "Shells Town: Die Garnison meldet 'alles ruhig' — hinter vorgehaltener Hand munkelt man anderes.",
  hafendorf_sirup: "Sirup-Hafendorf: Ein herrenloses Anwesen und eine Kneipe stehen zum Verkauf.",
  klippen_vorposten: "Felsklippen-Außenposten: Versorgungsschiffe bleiben aus; die Moral der Soldaten sinkt.",
  orangen_hafen: "Orangen-Hafen: Erneut wurde eine Ladung Zitrusfrüchte von Piraten gekapert.",
  windmuehlendorf: "Windmühlendorf: Alte Logbücher aus der Bibliothek sollen 'brisante Lücken' enthalten.",
};

export function worldEventsUpToDay(day) {
  return WORLD_EVENTS.filter((e) => e.day <= day);
}
