# Importer d'anciennes dépenses et gains (JSON)

Dans KELASI : **Dépenses → Comptes → Importer un fichier JSON**.
Le bouton **Télécharger le modèle** fournit `modele-import-depenses.json` (aussi présent dans `public/`).
Avant tout enregistrement, KELASI affiche un **aperçu** (nombre d'opérations, période, totaux, nouvelles catégories, lignes refusées).

## Structure

```json
{
  "format": "kelasi-depenses",
  "version": 1,
  "devise": "EUR",
  "comptes": [ { "nom": "Espèces", "type": "Espèces", "solde_initial": 0 } ],
  "operations": [
    { "date": "2025-07-19", "heure": "13:00", "type": "depense", "montant": 50.15,
      "categorie": "Factures", "sous_categorie": "Électricité", "compte": "Espèces", "note": "Facture Enerlec" }
  ]
}
```

## Champs d'une opération

| Champ | Obligatoire | Valeurs acceptées |
|---|---|---|
| `date` | oui | `AAAA-MM-JJ` (recommandé) ou `JJ/MM/AAAA`, `JJ.MM.AAAA` |
| `heure` | non | `HH:MM` (ex. `13:00`) — affichée dans le journal |
| `type` | oui* | `depense`, `revenu`, `virement` (aussi `expense`/`income`/`transfer`, `Ausgabe`/`Einkommen`) |
| `montant` | oui | nombre positif (`50.15`) ou texte (`"50,15"`, `"1.750,00 €"`) |
| `categorie` | non | nom d'une catégorie KELASI ; créée automatiquement si inconnue |
| `sous_categorie` | non | ex. `Électricité` sous `Factures` |
| `compte` | non | nom du compte ; créé si inconnu (défaut : premier compte ou « Espèces ») |
| `vers_compte` | pour un virement | compte qui reçoit l'argent |
| `note` | non | description libre (500 caractères max) |

\* Sans `type`, un montant négatif est compris comme une dépense et un montant positif comme un revenu.

## Noms reconnus automatiquement
Les noms de l'ancienne application en allemand sont convertis : `Miete` → Loyer, `Essen / Speisen` → Alimentation / Repas,
`Gehalt` → Salaire, `Lohn` → Paie, `Rechnung` → Factures, `Elektrizität` → Électricité, `Heizung` → Chauffage,
`Wasser` → Eau, `Kabel-TV` → Télévision, `Mobiltelefon` → Téléphone mobile, `Kleidung` → Vêtements,
`Körperpflege` → Soins personnels, `Haustier` → Animaux, `Kind` → Enfant, `Reise` → Voyage, `Unterhaltung` → Loisirs,
`Verkauf` → Vente, `Zuhause / Reparatur` → Maison / Réparation, `Konto Gebühr` → Frais bancaires,
`Speichern` → Épargne, `Kreditkarte` → Carte de crédit, `Nächstenliebe` → Dons / Solidarité, `Bargeld` → compte Espèces.

## Doublons
Chaque opération reçoit un identifiant calculé à partir de ses informations : **réimporter le même fichier n'ajoute rien en double**.
Deux opérations identiques dans le même fichier (même date, heure, montant, compte, catégorie et note) sont bien gardées toutes les deux.
