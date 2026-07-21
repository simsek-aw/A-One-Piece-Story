# Spieldesign

## Prämisse

Start kurz nach Gol D. Rogers Hinrichtung in Loguetown – der Funke, der das
große Piratenzeitalter entzündet. Der Spieler ist **eine von vielen kleinen
Geschichten**, die neben dem Kanon von One Piece existieren. Die großen
Manga-Ereignisse laufen im Hintergrund weiter (als Gerüchte/Kurzbegegnungen),
werden aber nicht umgeschrieben.

## Charakter

### Archetypen (nur Starts – keine feste Rolle)

| Archetyp | Fantasie | Attribut-Boni | Start-Skills |
|---|---|---|---|
| **Marine-Soldat** | Ordnung vs. Gewissen | +Stärke, +Zähigkeit, +Willenskraft | Schwertkunst, Schießen, Einschüchtern |
| **Piratenkapitän (angehend)** | Freiheit, Crew-Traum | +Charisma, +Willenskraft, +Glück | Überzeugen, Nahkampf, Navigation |
| **Barkeeper** | Geheimnisse, Neuanfang | +Verstand, +Charisma, +Geschick | Überzeugen, Wahrnehmung, Kochen, Medizin |

Jeder kann seine Rolle verlassen: Ein Marine kann desertieren und Pirat werden,
ein Barkeeper eine Crew gründen usw. Der Archetyp bestimmt nur den Start.

### Attribute (7, S.P.E.C.I.A.L.-inspiriert)

Stärke · Geschick · Zähigkeit · Verstand · Willenskraft · Charisma · Glück.
Basis 4, **8 Punkte** frei verteilen (1–10). Archetyp-Boni kommen obendrauf.

Attribut-Modifikator = `Wert − 5` (also Wert 5 = ±0, 6 = +1 …).

### Skills

Nahkampf, Schwertkunst, Schießen, Navigation, Medizin, Handwerk, Überzeugen,
Einschüchtern, Heimlichkeit, Wahrnehmung, Kochen/Barkeeping, **Haki (latent)**.
Jeder Skill hängt an einem Leitattribut. Ränge erhöhen den Wurf direkt.

### Perks (Fallout-Stil)

Bei Erstellung wählbar (später bei Levelaufstieg erweiterbar): Seebein,
Eisenkinn, Charmeur, Straßenkind, Unbeugsam.

## Proben

`1W20 + Attribut-Modifikator + Skill-Rang ≥ DC`

- **DC-Richtwerte:** leicht 8 · mittel 12 · schwer 16 · sehr schwer 20
- **Nat. 20** = kritischer Erfolg, **Nat. 1** = kritischer Patzer (unabhängig vom DC).

## Fortschritt

- **XP** bei sinnvollem Handeln (5–40 pro Zug, kritische Erfolge mehr).
- **Levelaufstieg** bei `100 × Level` XP; erhöht max. Trefferpunkte.
- **Trefferpunkte** = 20 + Zähigkeit × 5 (+ Perks) + 5 pro Level darüber.

## Pacing

Eine Szene = Stunden bis wenige Tage (`timeAdvanceDays`). Über Tage/Wochen
werden Kanon-Gerüchte freigeschaltet (`content/lore.js`), sodass sich die Welt
spürbar mit der Zeit weiterdreht.

## Gedächtnis & Beziehungen

Jeder handlungsrelevante NPC bekommt eine **stabile ID**. Die Engine speichert
Gesinnung (−100…100), Notizen und "zuletzt gesehen". Bei Wiederbegegnung fließt
das in den Prompt – Figuren reagieren auf frühere Entscheidungen. `flags`
merken sich einmalige Entscheidungen (z. B. `hat_marine_belogen`).

## Party / Crew

Rekrutierung über einen **Überzeugen-Check** (DC 13). Erfolgreiche Begleiter
treten der Party bei (mit Loyalität). Geplant: rollenspezifische Boni – je nach
Begleiter Hilfe bei Erkundung, Kampf, Handwerk oder sozialen Szenen (Roadmap).

## Plots & Twists

Der Spielleiter (bzw. der Mock) streut regelmäßig kleine Haken und gelegentliche
Wendungen ein – nie zu viele, aber genug für Spannung. Beim echten Claude-Provider
steuert der System-Prompt (`ai/systemPrompt.js`) Ton und Twist-Dichte.
