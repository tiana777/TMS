#!/usr/bin/env bash
# =====================================================================
#          TMS EXPRESS - INSTALLATEUR SERVEUR PRODUCTION (LINUX/UBUNTU)
# =====================================================================

set -e

echo "====================================================================="
echo "          TMS EXPRESS - INSTALLATEUR SERVEUR DE PRODUCTION"
echo "====================================================================="
echo ""

# Verification des privileges root ou sudo
if [ "$EUID" -ne 0 ]; then
  echo "[INFO] Pour installer les paquets systeme, execution avec sudo recommandee."
fi

# Verification de Python 3
if ! command -v python3 &> /dev/null; then
    echo "[INFO] Installation de Python 3 et paquets essentiels..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y python3 python3-pip python3-venv git curl
    else
        echo "[ERREUR] python3 n'est pas installe. Veuillez l'installer manuellement."
        exit 1
    fi
fi

# Verification de Node.js
if ! command -v node &> /dev/null; then
    echo "[INFO] Installation de Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Lancement du script de deploiement
echo "[INFO] Execution du script de configuration..."
python3 setup_server.py

echo ""
echo "====================================================================="
echo "[SUCCES] Deploiement termine avec succes !"
echo "====================================================================="
