<p align="center"><img src="./public/favicon.png" alt="icon" width="70"/></p>
<h1 align="center">Spotify Video Matcher</h1>
<p align="center"><img src="https://img.shields.io/github/v/tag/cide0/spotify-video-matcher?label=latest%20version&style=flat-square"/></p>

This small app allows you to watch YouTube music videos live for Spotify songs you are currently listening to. 
It uses the Spotify API to get playback information and the YouTube Data API to search for the videos.

## Current Features

- Tries to start video in sync with the song by skipping to the current playback position of the song.
- Pauses the video when the song is paused via Spotify (Refreshes every 3 seconds).
- Resumes the video when the song is resumed via Spotify (Refreshes every 3 seconds).
- Automatically switches to the next video when the song changes.
- Rick-roll possibility! :trollface:

Notes: If you run it locally, many videos will probably not be embeddable as some embeds are blocked by YouTube on http. 
Using a host with https should resolve this issue, at least it did for me.

## Setup

1. Create a new app in the Spotify Developer Dashboard: https://developer.spotify.com/dashboard/applications and add a redirect URI for your app (e.g., `http://127.0.0.1:8080/callback`).

2. Create a new project in the Google Cloud Console: https://console.cloud.google.com/
   - Enable the YouTube Data API v3 for your project
   - Create an API key for your project
If you need more API keys just repeat this step and add them to the `.env` file.

3. Edit `.env` and fill in your actual credentials:
   - `SPOTIFY_CLIENT_ID` - Your Spotify application client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify application client secret
   - `BASE_URL` - The base URL where your application is hosted (should be same base URL as redirect URI in Spotify app settings)
   - `GOOGLE_API_KEY_1` through `GOOGLE_API_KEY_6` - Your YouTube Data API keys, add as many as you like (up to 6)
   - `PORT` - Server port (default: 8080)

4. Run these make targets in order:
   - `make install`
   - `make up`

## Make Targets

There are different make targets available to install and run this project:
- `make build-dev` - Build the Docker image.
- `make install` - Run `make npm-install` and `make build-dev`.
- `make npm-install` - Install npm dependencies.
- `make up` - Start the container.
- `make down` - Stop the container.
- `make cleanup` - Cleanup all containers, images and volumes.
- `make list` - List all available make targets.
