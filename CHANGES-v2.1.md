# KELASI v2.1.0

## Compte bancaire
- **Correction** : « Actualiser le solde » modifiait le dernier relevé au lieu d'en créer un nouveau, donc aucun historique n'était gardé.
  Désormais chaque saisie crée un nouveau relevé qui devient le **solde actuel** ; les précédents restent dans l'historique avec l'écart (+/−).
- Le relevé le plus récent est déterminé par sa date puis son heure de saisie (deux soldes le même jour : le dernier saisi gagne).
- Chaque relevé de l'historique peut être modifié (crayon) ou supprimé (avec confirmation).
- Lisibilité : le montant du solde était sombre sur la carte verte ; il est maintenant blanc.

## Catégories (français, avec icônes)
Abonnement, Auto / Transport, Éducation / Livres, Alimentation / Repas, Restaurants, Salaire, Paie, Santé / Assurance, Animaux,
Enfant, Vêtements, Soins personnels, Carte de crédit, Loyer, Dons / Solidarité, **Factures** (sous-catégories : Électricité,
Chauffage, Internet, Télévision, Téléphone mobile, Eau, Enerlec), Voyage, Agence de voyage, Loisirs / Divertissement, Vente,
Maison / Réparation, Frais bancaires, Épargne, Emprunt à X, Prêt à X, Autre.
- La saisie n'affiche que les catégories adaptées : revenus (Salaire, Paie, Vente…) ou dépenses.
- Éditeur de catégorie : nom, usage (dépenses / revenus / les deux), catégorie parente, couleur, choix parmi 54 icônes, suppression.
- Les comptes existants reçoivent automatiquement les nouvelles catégories ; les anciennes catégories par défaut non renommées
  sont traduites (ex. « Courses » → « Alimentation / Repas »). Une catégorie supprimée ne revient pas.

## Versement manqué
- Si la dernière semaine (ou le dernier mois en mode mensuel) est terminée sans **aucun** versement, KELASI envoie une notification
  « Versement non effectué » (une seule fois par période). Sans autorisation de notification, un rappel s'affiche dans l'app.
- Les notifications passent maintenant par le service worker : elles fonctionnent sur Android (l'ancienne méthode y échouait).
- Limite : sans serveur d'envoi (push), la vérification a lieu à l'ouverture de l'application.

## Import JSON des anciennes dépenses / gains
- Dépenses → Comptes → **Importer un fichier JSON**, avec aperçu (nombre, période, totaux, nouveaux comptes/catégories, lignes refusées).
- **Modèle** téléchargeable dans l'app : `public/modele-import-depenses.json`. Documentation : `IMPORT_DEPENSES.md`.
- Dates précises (`AAAA-MM-JJ` ou `JJ/MM/AAAA`), heure, type, montant, catégorie / sous-catégorie, compte, virement, note.
- Noms de l'ancienne application en allemand reconnus (Miete, Gehalt, Rechnung, Bargeld…).
- Réimporter le même fichier ne crée pas de doublons.

## Vérifications
- 43 tests unitaires OK (dont import du modèle, doublons, noms allemands, catégories), build OK.
- Test navigateur mobile : deux soldes successifs (solde actuel + historique avec écart), import du modèle (8 opérations),
  catégories filtrées par type, rappel de versement manqué ; aucune erreur console.
