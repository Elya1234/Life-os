# LIFE-OS — Système d'Exploitation Personnel (Offline-First)

**LIFE-OS** est une application web personnelle complète, modulaire et *offline-first* conçue en **HTML5**, **CSS3** et **JavaScript Vanilla**, sans framework obligatoire, sans backend requis pour l'usage local et sans données fictives.

## Architecture & Livrables
- `index.html` : structure sémantique de l'application et des 13 sections.
- `styles.css` : système de design UX/UI moderne (mode sombre bleu nuit, mode clair minimaliste, mode automatique, responsive mobile/tablette/desktop).
- `app.js` : logique applicative, IndexedDB (`LIFE_OS_DB`), LocalStorage (`LIFE_OS_PREFS_V1`), minuteur Focus précis en arrière-plan, moteur de planification, recherche globale et export/import JSON.
- `manifest.json` : configuration PWA installable.
- `service-worker.js` : mise en cache des ressources essentielles pour le fonctionnement hors ligne.
- `README.md` : documentation technique et guide d'utilisation.

## Sections incluses
1. **Dashboard** : date du jour, message personnalisé, progression, actions rapides, vue quotidienne, retards, échéances et minuteur Focus intégré.
2. **Tâches** : création, édition, suppression, priorités, domaines, échéances et estimation de durée.
3. **Planning** : vues quotidienne, hebdomadaire et mensuelle, événements récurrents, temps de déplacement et tampons, détection de chevauchements, auto-planification respectant les obligations religieuses/protégées.
4. **Mode Focus** : Pomodoro (25/5/15 min par défaut), chronomètre, précision en arrière-plan, association à une tâche, historique et plein écran.
5. **Études (BTS OL)** : *Optique géométrique*, *Analyse de la vision*, *Étude technique des systèmes optiques*, *Gestion*, *Économie-droit*, *Activités professionnelles*.
6. **Business (ORPAZ-STYLE.COM)** : bijouterie or/argent, achat-revente d'or, Judaïca, Kippot sur mesure, e-commerce, suivi commercial et séparation explicite des responsabilités (*Judaïca* vs *Activités du père*).
7. **Torah** : *Tefila*, *Daf Hayomi*, *Guemara*, *Halakha*, *Moussar*, *Hok LéIsraël*, *Na'h et commentaires*, *Lecture personnelle*, paramétrage localisation/horaires manuels et respect du Shabbat/fêtes.
8. **Vie personnelle** : sport, santé, hygiène, sommeil, vie administrative, objectifs et organisation quotidienne.
9. **CRM Hybride** : espaces strictement séparés entre **CRM Personnel** et **CRM ORPAZ-STYLE**.
10. **Habitudes** : fréquence, historique, série de jours et statistiques réelles.
11. **Objectifs** : suivi par domaine et pourcentage d'avancement.
12. **Pilotage** : statistiques réelles et états vides clairs lorsqu'aucune donnée n'est encore saisie.
13. **Paramètres** : thème, hiérarchie modifiable des priorités, minuteur, Torah, export/import JSON et architecture future de synchronisation Notion via backend sécurisé.

## Déploiement local et GitHub Pages
- **Local** : ouvrez `index.html` ou servez le dossier via un serveur local (`python3 -m http.server 8080`).
- **GitHub Pages** : placez les fichiers à la racine d'un dépôt GitHub et activez GitHub Pages sur la branche principale.
