# Spotify Video Matcher

## Setup

1. Copy the example environment file `.env.example` and name it `.env`

2. Edit `.env` and fill in your actual credentials:
   - `SPOTIFY_CLIENT_ID` - Your Spotify application client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify application client secret
   - `BASE_URL` - The base URL where your application is hosted (should be same as redirect URI in Spotify app settings)
   - `GOOGLE_API_KEY_1` through `GOOGLE_API_KEY_6` - Your YouTube Data API keys, add as many as you like (up to 6)
   - `PORT` - Server port (default: 8080)

3. Run these make targets in order:
   - `make build_dev`
   - `make run`

## Running with Docker

There are different make targets available to install and run this project:
- `make build_dev` - Run `npm install` locally and build the Docker images
- `make run` - Start the container
- `make stop` - Stop the container
- `make cleanup` - Cleanup all containers, images and volumes
- `make list` - List all available make targets
