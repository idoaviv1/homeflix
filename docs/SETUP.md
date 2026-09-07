# Omflix Setup Guide

## Prerequisites

- Arch Linux (EndeavourOS, Manjaro, etc.)
- Node.js >= 20
- Docker + Docker Compose
- FFmpeg with NVENC support
- NVIDIA GPU + driver (optional)

## Quick Setup

```bash
# Clone the repository
git clone <repo-url> omflix
cd omflix

# Copy environment file
cp .env.example .env
# Edit .env with your settings (database password is auto-generated)

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Push database schema
pnpm --filter @omflix/database db:push

# Development mode
./omflix dev

# Production mode
./omflix build
./omflix up
```

## Systemd Service

```bash
# Copy service file
sudo cp infra/omflix.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable omflix
sudo systemctl start omflix

# Check status
sudo systemctl status omflix
```

## Access Points

| Interface | URL |
|-----------|-----|
| LAN | http://YOUR_LAN_IP:8096 |
| Tailscale | http://YOUR_TAILSCALE_HOSTNAME:8096 |
| Admin | http://127.0.0.1:8097 (localhost only) |
| Dev Frontend | http://localhost:5173 |

## Media Directory

Create the media directory structure:

```bash
sudo mkdir -p /media/windows/omflix/media/{movies,tv}
sudo mkdir -p /media/windows/omflix/data/{cache,transcodes,thumbnails,metadata,temp}
sudo chown -R $USER:$USER /media/windows/omflix
```

### Movie naming
```
/media/windows/omflix/media/movies/
  Movie Name (2025)/
    Movie Name (2025).mkv
```

### TV Show naming
```
/media/windows/omflix/media/tv/
  Series Name (2024)/
    Season 01/
      Series Name - S01E01 - Episode Name.mkv
```

## TMDB API Key

1. Create account at https://www.themoviedb.org
2. Go to Settings → API
3. Request an API key
4. Add to `.env`:
   ```
   TMDB_API_KEY=your_key_here
   TMDB_ACCESS_TOKEN=your_token_here
   ```

## Troubleshooting

### Docker services won't start
```bash
docker compose logs
```

### Database connection failed
```bash
docker compose ps
# Ensure postgres container is healthy
```

### GPU transcoding not working
```bash
# Check NVIDIA driver
nvidia-smi
# Check FFmpeg NVENC
ffmpeg -encoders | grep nvenc
```
