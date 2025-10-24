# Cadenza OMR Service - Reinstallazione Guide

## Prerequisiti

- Ubuntu 22.04 (o Debian-based)
- Docker & Docker Compose installati
- Almeno 2GB RAM, 10GB storage

---

## Step 1: Installa Docker (se non presente)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Logout e login per applicare gruppo docker
exit
# (riconnettiti via SSH)

# Verifica installazione
docker --version
docker-compose --version
```

---

## Step 2: Download Audiveris Binary

**Opzione A: Download Automatico (Recommended)**

```bash
# Crea directory
mkdir -p ~/cadenza-omr-service
cd ~/cadenza-omr-service

# Download Audiveris 5.3.1
wget https://github.com/Audiveris/audiveris/releases/download/5.3.1/Audiveris-5.3.1.tar.gz

# Estrai
tar -xzf Audiveris-5.3.1.tar.gz

# Rinomina directory
mv Audiveris-5.3.1 audiveris

# Verifica
ls audiveris/bin/Audiveris
```

**Opzione B: Usa Backup Locale**

Se hai salvato `audiveris-5.3.1.tar.gz` nel backup:

```bash
cd ~/cadenza-omr-service

# Copia da backup locale
cp /path/to/backup/audiveris-5.3.1.tar.gz .

# Estrai
tar -xzf audiveris-5.3.1.tar.gz
mv Audiveris-5.3.1 audiveris
```

**Opzione C: Download Diretto dal Sito**

Se GitHub è down, scarica da: https://audiveris.github.io/audiveris/_pages/install/sources/

---

## Step 3: Copia File di Configurazione

```bash
cd ~/cadenza-omr-service

# Copia i file dal backup
# Assicurati che siano presenti:
# - Dockerfile
# - docker-compose.yml
# - server.py

# Verifica
ls -la
# Dovresti vedere:
# audiveris/
# Dockerfile
# docker-compose.yml
# server.py
```

---

## Step 4: Build Docker Image

```bash
cd ~/cadenza-omr-service

# Build immagine (ci mettono ~5 minuti)
docker-compose build --no-cache

# Verifica build
docker images | grep cadenza-omr
```

---

## Step 5: Avvia Servizio

```bash
# Start container
docker-compose up -d

# Verifica che sia running
docker-compose ps

# Verifica log
docker-compose logs -f

# Dovresti vedere:
# "Running on http://0.0.0.0:8080"
```

---

## Step 6: Test Service

```bash
# Health check
curl http://localhost:8080/health

# Dovresti ricevere:
# {"status":"ok","service":"cadenza-omr",...}
```

---

## Troubleshooting

### **Problema: "Permission denied" per Docker**

```bash
# Aggiungi user a gruppo docker
sudo usermod -aG docker $USER

# Logout e login
exit
# (riconnettiti)
```

### **Problema: "Port 8080 already in use"**

```bash
# Trova processo sulla porta 8080
sudo lsof -i :8080

# Kill processo
sudo kill -9 <PID>

# Oppure cambia porta in docker-compose.yml:
# ports:
#   - "8081:8080"  # Usa 8081 invece
```

### **Problema: Audiveris non funziona**

```bash
# Entra nel container
docker-compose exec omr-service bash

# Verifica Audiveris
/opt/audiveris/bin/Audiveris -help

# Se da errore, reinstalla JRE
apt-get update && apt-get install -y default-jre

# Exit
exit

# Restart container
docker-compose restart
```

### **Problema: "Out of memory"**

```bash
# Aumenta memoria Docker
# Edit: /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json

# Add:
{
  "default-shm-size": "2g"
}

# Restart Docker
sudo systemctl restart docker

# Rebuild
docker-compose down
docker-compose up -d
```

---

## Comandi Utili

```bash
# Start service
docker-compose up -d

# Stop service
docker-compose down

# Restart service
docker-compose restart

# View logs
docker-compose logs -f

# View logs (last 100 lines)
docker-compose logs --tail=100

# Enter container
docker-compose exec omr-service bash

# Rebuild after code changes
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check resource usage
docker stats

# Clean up old images
docker system prune -a
```

---

## Struttura File Finale

```
~/cadenza-omr-service/
├── audiveris/
│   ├── bin/
│   │   └── Audiveris
│   ├── lib/
│   └── ...
├── Dockerfile
├── docker-compose.yml
├── server.py
└── (container files - auto-generated)
```

---

## Notes

- **Audiveris Version:** 5.3.1
- **Python:** 3.10
- **Default Port:** 8080
- **Timeout:** 600 seconds (10 min)
- **License:** Audiveris = AGPL 3.0, Cadenza OMR wrapper = AGPL 3.0

---

## Next Steps (Dopo Reinstallazione)

1. ✅ Service running su `http://localhost:8080`
2. Update DNS del domain per puntare al nuovo droplet
3. Setup SSL certificate (Let's Encrypt)
4. Configure firewall (ufw)
5. Setup monitoring (opcional)

---

## Support

Se incontri problemi:
1. Controlla i log: `docker-compose logs -f`
2. Verifica che Audiveris binary sia presente: `ls audiveris/bin/Audiveris`
3. Test manuale: `docker-compose exec omr-service /opt/audiveris/bin/Audiveris -help`

---

**Last Updated:** October 2025
**Audiveris Version:** 5.3.1
**Docker Version:** 24.0+