# Déploiement OVH VPS

## VPS ciblé

- Hôte : `vps-48aa0bd2.vps.ovh.net`
- IPv4 : `51.91.123.204`
- Utilisateur : `ubuntu`

## Ce qui a été installé

- PostgreSQL 17 installé sur le VPS
- Base créée : `tickets_prod`
- Utilisateur PostgreSQL créé : `tickets_app`
- Fichier d'environnement API créé sur le VPS : `/home/ubuntu/tickets-api.env`
- Template `systemd` ajouté : [deploy/systemd/tickets-api.service](deploy/systemd/tickets-api.service)
- Template `nginx` ajouté : [deploy/nginx/tickets.conf](deploy/nginx/tickets.conf)
- Certificat Let's Encrypt actif sur `https://vps-48aa0bd2.vps.ovh.net`

## URLs publiques

- Frontend : `https://vps-48aa0bd2.vps.ovh.net`
- API santé : `https://vps-48aa0bd2.vps.ovh.net/api/health`

Le mot de passe PostgreSQL généré n'est **pas** stocké dans le dépôt. Il est conservé uniquement dans `/home/ubuntu/tickets-api.env` sur le VPS.

## Configuration de l'application

Utiliser [/.env.vps.example](.env.vps.example) comme base pour un déploiement sur ce VPS.

Valeurs principales :

- `VITE_DB_MODE=remote`
- `VITE_API_BASE_URL=https://vps-48aa0bd2.vps.ovh.net/api`
- `FRONTEND_ORIGIN=https://vps-48aa0bd2.vps.ovh.net`
- `DATABASE_URL=postgresql://tickets_app:...@localhost:5432/tickets_prod`

## Commandes utiles sur le VPS

Afficher la config API générée :

```bash
cat /home/ubuntu/tickets-api.env
```

Tester PostgreSQL :

```bash
source /home/ubuntu/tickets-api.env
psql "$DATABASE_URL" -c "SELECT current_database(), current_user;"
```

## Déploiement API + Nginx

- Code API déployé dans `/home/ubuntu/tickets-app`
- Frontend statique servi depuis `/var/www/tickets-app/dist`
- Service API attendu : `tickets-api.service`
- VirtualHost Nginx attendu : `/etc/nginx/sites-available/tickets.conf`

## Remarque architecture

En production sur ce VPS, le frontend doit être buildé en mode `remote` :

- le navigateur lit et écrit les données via l'API ;
- PostgreSQL devient la source de vérité partagée ;
- IndexedDB n'est pas utilisée comme base principale de production ;
- PostgreSQL reste accessible localement sur le VPS via `localhost`, ce qui évite d'exposer le port 5432 publiquement.