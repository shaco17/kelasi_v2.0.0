# KELASI v2.0.0 — Mise à jour majeure

## Dépenses (refonte complète, modèle « livre de comptes »)
- En haut : anneau des dépenses du mois par catégorie, avec la part **non dépensée** des revenus.
- Barre sombre fixe : solde du mois, revenus / dépenses, changement de mois (‹ ›).
- **Journal en frise** : opérations groupées par jour (date à gauche, jour de la semaine à droite),
  montants alignés à droite dans une colonne fixe (chiffres tabulaires), icône de catégorie posée sur
  une ligne verticale, catégorie + heure puis compte à droite, note en dessous.
- Filtres Tout / Dépenses / Revenus / Virements et recherche.
- **Modifier / supprimer** : toucher une opération ouvre sa fiche (bouton « Supprimer » et « Enregistrer »).
- Boutons d'action fixes **+ Revenu** et **− Dépense** ; saisie avec grand montant et grille de catégories à icônes.
- Formulaires dédiés pour comptes, budgets et récurrences (fin des fenêtres `prompt`, choix de catégorie par liste).
- Onglets : Journal, Analyse (répartition, 6 derniers mois, budgets, à venir), Budgets, Récurrences, Comptes.

## Navigation mobile
- 5 entrées au lieu de 6 : Accueil, Versements, Dépenses, Projets, **Plus** (ouvre le menu : Prévisions, Dettes, Banque, Réglages).
- Icônes 26 px, libellés 11,5 px, zones tactiles de 60 px, pastille sur l'onglet actif.

## Synchronisation
- Le bandeau permanent « Données synchronisées » et le bandeau « Mode local » sont supprimés.
- Remplacés par un **voyant** dans la barre du haut (vert synchronisé, bleu clignotant en cours, orange en attente, gris hors ligne, violet mode local).
- Toucher le voyant affiche l'état et permet de **mettre les notifications de synchro en muet** (mémorisé sur l'appareil).
- Hors mode muet, un message n'apparaît que lors d'un changement important (passage en attente, synchro rétablie).
- Les messages (toasts) s'affichent en haut sur mobile et ne bloquent plus les boutons.

## Supabase : maintien actif
- `.github/workflows/supabase-keepalive.yml` : requête de lecture deux fois par semaine (lundi et jeudi)
  pour éviter la mise en pause du projet gratuit. Voir `MISE_A_JOUR_GITHUB.md` pour les secrets à créer.

## Mise à jour effective sur les appareils
- `index.html` servi sans cache, fichiers `assets/` versionnés en cache long.
- Le service worker vérifie aussi les nouvelles versions quand l'app revient au premier plan.
- Suppression de l'ancien `public/sw.js` manuel (le service worker est généré au build).

## Vérifications
- 36 tests unitaires OK, build OK.
- Test navigateur mobile (390 px) : création de compte, ajout, modification et suppression d'une dépense, aucune erreur console.
