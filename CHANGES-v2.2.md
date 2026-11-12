# KELASI v2.2.0

## Comptes bancaires dans Dépenses
- Comptes ajoutés par défaut dans Dépenses : **Espèces, N26, Sparkasse, Commerzbank, Wise, Revolut** (solde initial 0 €).
- Ajoutés automatiquement aux données existantes s'ils n'existent pas déjà sous ce nom ; un compte supprimé ne revient pas.
- Ces comptes concernent uniquement le suivi des dépenses (la page « Compte bancaire » de l'épargne n'est pas modifiée).

## Catégorie « Transfert »
- Nouvelle catégorie (revenus et dépenses) pour l'argent qui entre ou sort d'Espèces depuis un autre compte ou une personne.
- L'import reconnaît aussi `TRANSFER`, `EINZIEHUNG` → Transfert et `DIVERS` → Autre.

## Divers
- L'onglet actif des Dépenses reste visible dans la barre d'onglets (il pouvait être à moitié caché après un import).

## Vérifications
- 43 tests OK, build OK.
- Import navigateur d'un relevé réel de 867 opérations (juillet 2024 → novembre 2026) : 0 erreur, aucune catégorie inconnue,
  données conservées après rechargement, réimport sans doublon.
