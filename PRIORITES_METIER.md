# 📋 Récapitulatif des Priorités Métier & Suivi d'Implémentation

Ce document centralise et suit l'avancement des fonctionnalités prioritaires demandées pour **TMS Express**.

---

### État d'avancement des priorités :

- [x] **1. Colis Province & Axes** *(Terminé)*  
  Ne pas créer de nouvel axe spécifique pour les colis Province : ils doivent être rattachés et acheminés via les 9 axes logistiques déjà existants (selon la gare routière de départ).
  - ✅ Suppression des axes virtuels Province et rattachement systématique aux 9 gares réelles et leurs axes urbains.
  - ✅ Détection automatique par nom de gare/coopérative.
  - ✅ Tests unitaires validés (`test_province_urban_axes_mapping.py`).

- [ ] **2. Feuille de route & Clôture livreur**  
  La feuille de route du livreur ne doit pas être supprimée lors de la clôture de la tournée / du compte : elle doit rester enregistrée et consultable comme archive pour les vérifications et contrôles ultérieurs.

- [x] **3. Validation des retours colis** *(Terminé)*  
  Ajouter un bouton explicite « Remis au bureau » (ou « Retour Hub / Dépôt ») pour acter formellement la réintégration des colis non livrés rapportés au bureau par le livreur.
  - ✅ Bouton d'action direct « Remis au bureau » présent sur chaque colis au statut `REPORTE` ou `ANNULE_RETOUR` dans l'écran de suivi/pointage (`/tracking`).
  - ✅ Bouton d'action groupée « Remis au bureau (N) » pour valider par lot la réintégration de tous les retours physiques du soir.
  - ✅ Réintégration automatique en stock `EN_DEPOT`, désaffectation du coursier et de la tournée, et horodatage nominatif dans l'historique d'audit.
  - ✅ Backend domain `reintegrate_to_hub()` et tests unitaires validés (25/25 tests passés).

- [ ] **4. Détail financier dans le compte-rendu**  
  Dans le compte-rendu de tournée / débriefing financier, détailler clairement les montants encaissés par expéditeur (donneur d'ordre).

- [x] **5. Affichage dans la vue par expéditeur** *(Terminé)*  
  Lors de la consultation des colis par expéditeur, afficher le lieu / quartier précis de livraison plutôt que le nom générique de l'axe.
  - ✅ Dans l'écran CRM & Expéditeurs (`/crm`), remplacement de la colonne `Axe` par `Lieu / Quartier Précis`.
  - ✅ Affichage en gras du lieu/quartier exact de livraison (`delivery_address`) avec sous-titre badge indiquant l'axe urbain ou provincial.
  - ✅ Données de test réalistes injectées (Cybermarchands, Entreprises, Particuliers) avec quartiers réels de Tanà et gares de province.

- [ ] **6. Déduction des frais de livraison prépayés**  
  Gérer la déduction des frais de livraison lorsque l'expéditeur les a déjà encaissés à l'avance auprès de son client (frais déjà payés au vendeur).

- [ ] **7. Gestion des litiges & Dépenses livreurs**  
  Corriger les litiges livreurs : les dépenses (carburant, frais annexes, etc.) ne doivent pas être comptabilisées ou mélangées dans les litiges.

- [x] **8. Tableau de bord / Récapitulatif général du jour** *(Terminé)*  
  Afficher un récapitulatif global bien visible indiquant :
  - Le nombre de colis livrés,
  - Le nombre de retours,
  - Le montant total des frais encaissés aujourd'hui.
  - ✅ Bandeau Récapitulatif en 3 blocs majeurs en haut du Tableau de Bord (`/`).
  - ✅ Bloc Vert « Colis Livrés » (nombre total et pourcentage d'aboutissement).
  - ✅ Bloc Rose « Retours Colis » (colis refusés/annulés à traiter).
  - ✅ Bloc Bleu « Frais Encaissés Aujourd'hui » (Chiffre d'Affaires net transporteur TMS perçu sur la journée).
  - ✅ Build validé et données de test en temps réel synchronisées.

- [x] **9. Modification d'adresse et de tarif selon le statut** *(Terminé)*  
  - Si le colis est encore « En dépôt » : autoriser la modification du lieu de livraison (frais verrouillés).
  - Si le colis est déjà « En cours de livraison » : autoriser la modification du lieu ET des frais de livraison (pills 3k/4k/5k ou montant libre).
  - ✅ Contrôle strict backend dans `update_parcel_contact` (lève `BusinessRuleViolationException` si tentative de changer les frais en dépôt).
  - ✅ Recalcul automatique de l'axe logistique à la saisie de la nouvelle adresse.
  - ✅ Modale d'édition ergonomique avec badge de statut, verrouillage dynamique et recalcul instantané du total COD sur `/tracking`.
  - ✅ Tests unitaires automatisés validés (`test_parcel_address_fee_update.py`).
