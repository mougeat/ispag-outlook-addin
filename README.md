# ISPAG CRM – Add-in Outlook

Panneau latéral dans la rédaction d'un mail Outlook (bureau, web, Mac) pour insérer les **modèles de mails du CRM** avec leurs champs modifiables, à la manière de l'add-in HubSpot.

## Fonctionnalités
- Connexion avec le compte WordPress ISPAG (jeton personnel conservé dans le navigateur de l'add-in).
- Liste des modèles par langue et dossier, avec filtre ; les modèles privés restent visibles à leur seul propriétaire.
- Recherche d'un deal : les champs `{{deal_name}}`, `{{contact_first_name}}`, `{{company_name}}`… sont préremplis depuis `/deal-context`.
- Tous les `{{champs}}` du modèle sont **modifiables** avant insertion, avec aperçu en direct (champs vides surlignés).
- Insertion du corps et de l'objet dans le mail ; le destinataire est ajouté si « À » est vide.

## Installation
Aucune compilation : ce sont des fichiers statiques.
1. Publier le contenu de ce dossier en HTTPS (GitHub Pages, ou un dossier du serveur WordPress).
2. `manifest.xml` pointe vers `https://mougeat.github.io/ispag-outlook-addin/` ; à adapter si l'hébergement change.
3. Installer :
   - **Pour toute l'équipe** : centre d'administration Microsoft 365 → Paramètres → Applications intégrées → *Charger des applications personnalisées* → `manifest.xml`.
   - **Pour soi-même** : Outlook → Obtenir des compléments → Mes compléments → *Ajouter un complément personnalisé* → depuis un fichier.
4. Le bouton **Modèles CRM** apparaît dans le ruban d'un nouveau mail.

## Côté CRM
Utilise `classes/class-ispag-mail-template-api.php` : routes `/auth/login`, `/auth/me`, `/mail-templates`, `/mail-template-folders`, `/deals-search`, `/deal-context`, authentifiées par l'en-tête `X-ISPAG-API-Key`. L'en-tête est autorisé en CORS pour ces routes. Les tags sont ceux de `ISPAG_Template_Repository::parse_tags()` (`{{variable}}`).

## Pistes (inspirées de HubSpot)
- Journaliser le mail envoyé comme activité sur le contact / deal (« Log to CRM »).
- Panneau de lecture : afficher la fiche contact et ses deals pour l'expéditeur d'un mail reçu.
- Modèles en séquence, suivi d'ouverture, création rapide de contact depuis un mail.
- SSO Office à la place de la connexion par mot de passe.

