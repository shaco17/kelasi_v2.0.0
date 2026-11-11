# Mettre KELASI v2.0 sur GitHub (remplacement complet)

## 1. Remplacer les fichiers
Le téléversement GitHub (« Add files via upload ») **ajoute ou remplace** des fichiers mais **ne supprime pas** les anciens.
Supprime donc d'abord ces anciens fichiers/dossiers du dépôt s'ils existent encore :

- `dist/`, `assets/` (à la racine), `icons/` (à la racine)
- `sw.js`, `workbox-9c191d2f.js`, `favicon.svg`, `logo.svg`, `manifest.webmanifest`, `_redirects` (à la racine)
- `public/sw.js`, `src/components.tmp`, `src/styles.expenses.tmp`

Puis téléverse **tout le contenu** du dossier `kelasi-v2.0.0` (y compris le dossier caché `.github` et `.gitignore`).
Astuce : dans le navigateur, glisse le contenu du dossier, pas le dossier lui-même.

## 2. Netlify
Netlify reconstruit automatiquement (`npm run build`, dossier `dist`). Le nouveau service worker
remplace l'ancien : à la prochaine ouverture, l'app se recharge seule et affiche « Mise à jour appliquée ».
Version visible dans Réglages : **2.0.0**.

## 3. Supabase
1. SQL Editor : exécuter `SUPABASE_V1.8_CORRECTIF.sql` (si ce n'est pas déjà fait).
2. Maintien actif : GitHub → **Settings → Secrets and variables → Actions → New repository secret** :
   - `SUPABASE_URL` = l'URL du projet (ex. `https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` = la clé publique **anon / publishable** (jamais la clé `service_role`)
3. Onglet **Actions** → « Supabase keep-alive » → **Run workflow** pour tester (coche verte attendue).

Remarque : GitHub désactive les tâches planifiées d'un dépôt sans aucun commit pendant 60 jours ;
un e-mail prévient avant. Il suffit alors de cliquer « Enable workflow » dans l'onglet Actions.
