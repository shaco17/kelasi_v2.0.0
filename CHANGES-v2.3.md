# KELASI v2.3.0

## Tout l'historique, pas seulement 6 mois
- Sélecteur **Mois / Année / Tout** sous la barre de solde des Dépenses : le journal, l'anneau et les totaux
  suivent la période choisie. « Tout » affiche les opérations depuis la toute première.
- Analyse : graphique revenus / dépenses sur toute la période (défilement horizontal, ouvert sur les mois récents)
  et **relevé mensuel** complet : revenus, dépenses, solde et cumul de chaque mois, avec total.
  Toucher un mois (barre ou ligne) ouvre son journal.

## Anneau cliquable : détail par catégorie
- Toucher l'anneau (ou « Détails » dans Analyse) ouvre la répartition par catégorie de la période :
  icône, nombre d'opérations, part en %, montant, barre proportionnelle, bascule Dépenses / Revenus.
- En vue mensuelle, le budget de la catégorie est affiché sous le montant ; un dépassement est signalé (⚠, montant en rouge).
- Toucher une catégorie ouvre le journal filtré sur cette catégorie (sous-catégories incluses) ; le filtre se retire avec ×.

## Vérifications
- 46 tests OK (périodes, relevé mensuel avec cumul, détail par catégorie et budget), build OK.
- Navigateur avec le relevé réel importé (867 opérations) : novembre 2026 = 837,00 € de revenus et 802,90 € de dépenses,
  détail identique à l'ancienne application ; « Tout » = 29 mois (juillet 2024 → novembre 2026), aucune erreur console.
