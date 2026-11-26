# 📋 Récapitulatif des Priorités Métier & Suivi d'Implémentation

Ce document centralise et suit l'avancement des fonctionnalités prioritaires demandées pour **TMS Express**.

---

### État d'avancement des priorités :

- [x] **1. Colis Province & Axes** *(Terminé)*  
  Ne pas créer de nouvel axe spécifique pour les colis Province : ils doivent être rattachés et acheminés via les 9 axes logistiques déjà existants (selon la gare routière de départ).
  - ✅ Suppression des axes virtuels Province et rattachement systématique aux 9 gares réelles et leurs axes urbains.
  - ✅ Détection automatique par nom de gare/coopérative.
  - ✅ Tests unitaires validés (`test_province_urban_axes_mapping.py`).

- [x] **2. Feuille de route & Clôture livreur** *(Terminé)*  
  La feuille de route du livreur ne doit pas être supprimée lors de la clôture de la tournée / du compte : elle doit rester enregistrée et consultable comme archive pour les vérifications et contrôles ultérieurs.
  - ✅ Les tournées clôturées (`CLOTURE`) et leurs colis restent conservés en base sans suppression lors de la clôture (`/cash`).
  - ✅ Onglet **Écran 04 • Feuilles de Route** (`/dispatch`) enrichi avec filtre **Toutes / Actives / Archives Clôturées** pour consulter et contrôler les feuilles de route archivées.

- [x] **3. Validation des retours colis** *(Terminé)*  
  Ajouter un bouton explicite « Remis au bureau » (ou « Retour Hub / Dépôt ») pour acter formellement la réintégration des colis non livrés rapportés au bureau par le livreur.
  - ✅ Bouton d'action direct « Remis au bureau » présent sur chaque colis au statut `REPORTE` ou `ANNULE_RETOUR` dans l'écran de suivi/pointage (`/tracking`).
  - ✅ Bouton d'action groupée « Remis au bureau (N) » pour valider par lot la réintégration de tous les retours physiques du soir.
  - ✅ Réintégration automatique en stock `EN_DEPOT`, désaffectation du coursier et de la tournée, et horodatage nominatif dans l'historique d'audit.
  - ✅ Backend domain `reintegrate_to_hub()` et tests unitaires validés (25/25 tests passés).

- [x] **4. Détail financier dans le compte-rendu** *(Terminé)*  
  Dans le compte-rendu de tournée / débriefing financier, détailler clairement les montants encaissés par expéditeur (donneur d'ordre).
  - ✅ Regroupement automatique par expéditeur (`vendorBreakdown`) dans l'écran de clôture de caisse (`/cash`) avec nombre de colis, COD marchandise, frais et total encaissé.
  - ✅ Détail par expéditeur également inclus sur le bordereau de décharge imprimable.

- [x] **5. Affichage dans la vue par expéditeur** *(Terminé)*  
  Lors de la consultation des colis par expéditeur, afficher le lieu / quartier précis de livraison plutôt que le nom générique de l'axe.
  - ✅ Dans l'écran CRM & Expéditeurs (`/crm`), remplacement de la colonne `Axe` par `Lieu / Quartier Précis`.
  - ✅ Affichage en gras du lieu/quartier exact de livraison (`delivery_address`) avec sous-titre badge indiquant l'axe urbain ou provincial.
  - ✅ Données de test réalistes injectées (Cybermarchands, Entreprises, Particuliers) avec quartiers réels de Tanà et gares de province.

- [x] **6. Déduction des frais de livraison prépayés** *(Terminé)*  
  Gérer la déduction des frais de livraison lorsque l'expéditeur les a déjà encaissés à l'avance auprès de son client (frais déjà payés au vendeur).
  - ✅ **Backend Domain & Persistance** : champ `frais_prepayes_vendeur` sur `Parcel` / `ParcelORM` (migration `migrate_frais_prepayes_vendeur.py`, également intégrée à `seed.py` et `clean_for_production.py`).
  - ✅ **Calcul COD & Tournée** : `Parcel.total_to_collect` exclut `delivery_fee` lorsque `frais_prepayes_vendeur=True` (le livreur n'encaisse que la marchandise) et `Tour.calculate_theoretical_total()` s'ajuste automatiquement.
  - ✅ **Reversement Vendeur** : `PayoutUseCases` déduit automatiquement les frais de port prépayés au vendeur du solde net reversé (`total_merchandise - total_delivery_fees`) et expose `frais_prepayes_vendeur` dans les résumés.
  - ✅ **Frontend** : case à cocher `Frais prépayés vendeur` à la réception (`/inbound`), option `Frais de Livraison Payés au Vendeur` (`DELIVERY_FEE_ONLY`) dans la modale de règlement anticipé (`/tracking`), ajustement du décompte livreur dans `/cash` et badge explicatif dans `/cash` et `/crm`.
  - ✅ **Tests unitaires** : `test_frais_prepayes_vendeur.py` validé.

- [x] **7. Gestion des litiges & Dépenses livreurs** *(Terminé)*  
  Corriger les litiges livreurs : les dépenses (carburant, frais annexes, etc.) ne doivent pas être comptabilisées ou mélangées dans les litiges.
  - ✅ **Backend Domain** : `Tour` porte désormais `expenses_amount` / `expenses_reason` ; `compute_cash_discrepancy()` calcule l'écart net `(espèces + mobile + dépenses justifiées) − dû théorique`.
  - ✅ **Backend Application** : `close_tour` reçoit espèces, mobile et dépenses séparément (`CloseTourDTO`) ; motif obligatoire si dépenses > 0 ; le litige `DEFICIT_COD` automatique n'est ouvert que sur le **déficit net non justifié**.
  - ✅ **Garde-fou litiges** : `CourierDebt.open_new()` refuse la création manuelle d'un litige dont le motif est une dépense d'exploitation (carburant, essence, gasoil, péage, stationnement, frais de route/annexes). Vérification uniquement à la création : les litiges historiques restent consultables.
  - ✅ **Persistance** : colonnes `tournees.total_depenses` et `tournees.motif_depenses` (migration `migrate_tour_expenses.py`, également intégrée à `seed.py` et `clean_for_production.py`).
  - ✅ **Frontend** : saisie montant + motif des dépenses dans la clôture de caisse (`/cash`), affichage sur le reçu, bandeau explicatif et blocage côté formulaire dans `/disputes`.
  - ✅ **Tests unitaires** : scénarios dépenses sans litige, déficit net seul en litige, refus d'un litige carburant, rechargement des litiges historiques.

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

- [x] **10. Import CSV/Excel : colonnes `cod`, `fee` et changement d'axe éditables avant enregistrement** *(Terminé)*  
  Ajouter les colonnes `cod` (montant marchandise) et `fee` (frais de livraison) dans l'import (`/import`) :
  - Si `cod` n'est pas rempli, le mettre automatiquement à `0`.
  - Si `fee` n'est pas rempli, le pré-remplir automatiquement avec le `tarif_livraison` de l'axe existant détecté (sans montant par défaut fixe).
  - Permettre à l'agent de modifier l'axe, `cod` et `fee` directement dans la prévisualisation avant d'enregistrer le fichier importé (avec mise à jour de `fee` si l'axe change).
