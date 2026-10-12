# Add-in Outlook « ISPAG CRM » — fiche pour l'administrateur M365

## Objet
Add-in interne qui permet d'insérer dans un mail en cours de rédaction les modèles de mails du CRM ISPAG (champs deal, contact, entreprise préremplis et modifiables).

## Déploiement demandé
Centre d'administration M365 → Paramètres → Applications intégrées → Charger des applications personnalisées → lien du manifeste :
`https://mougeat.github.io/ispag-outlook-addin/manifest.xml`

Utilisateurs : mon compte pour un test, puis l'équipe commerciale.
Client visé : Outlook web, Windows, Mac (mode rédaction d'un message).

## Permission demandée
`ReadWriteItem` : écrire l'objet et le corps du mail en cours de rédaction, et lire/renseigner le champ « À » (ajout du destinataire s'il est vide). L'add-in ne lit ni la boîte de réception, ni les mails reçus, ni les contacts Outlook.

## Flux de données
| Destination | Contenu |
|---|---|
| `https://mougeat.github.io/ispag-outlook-addin/` (GitHub Pages) | Fichiers statiques de l'add-in (HTML, CSS, JS, icônes). Aucune donnée n'y est envoyée. |
| `https://appsforoffice.microsoft.com` | Bibliothèque officielle Office.js. |
| `https://app.ispag-asp.ch/wp-json/ispag/v1/` (CRM ISPAG) | Connexion, liste des modèles, recherche de deal, contexte du deal. |

Aucun service tiers. Le contenu des mails n'est jamais envoyé au CRM : l'add-in ne fait que récupérer des modèles et les insérer localement.

## Authentification
- Identifiants WordPress ISPAG saisis dans le panneau ; le CRM renvoie une clé personnelle, conservée dans le stockage local de l'add-in et envoyée dans l'en-tête `X-ISPAG-API-Key`.
- Les modèles privés ne sont visibles que par leur propriétaire.
- Déconnexion possible depuis le panneau (efface la clé locale).

## Domaines à autoriser
`mougeat.github.io`, `appsforoffice.microsoft.com`, `app.ispag-asp.ch`.

## Contact
ISPAG — code source : https://github.com/mougeat/ispag-outlook-addin
