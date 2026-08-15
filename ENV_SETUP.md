# Spotify Video Matcher - Environment Configuration

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your actual credentials:
   - `SPOTIFY_CLIENT_ID` - Your Spotify application client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify application client secret
   - `BASE_URL` - The base URL where your application is hosted
   - `GOOGLE_API_KEY_1` through `GOOGLE_API_KEY_6` - Your YouTube Data API keys
   - `PORT` - Server port (default: 8080)

3. **Important**: Never commit the `.env` file to version control. It's already listed in `.gitignore`.

## Running with Docker

The application uses Docker Compose to load environment variables from `.env` automatically:

```bash
docker-compose up -d
```

The `.env` file is automatically loaded into the container via the `env_file` directive in `docker-compose.yml`.

## Running without Docker

```bash
npm install
npm start
```

The application will load environment variables from `.env` using the `dotenv` package.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify OAuth client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify OAuth client secret |
| `BASE_URL` | Yes | Application base URL (e.g., `http://localhost:8080`) |
| `GOOGLE_API_KEY_1` to `GOOGLE_API_KEY_6` | Yes | YouTube Data API keys (for quota rotation) |
| `PORT` | No | Server port (default: 8080) |

## API Key Rotation

The application uses multiple Google API keys to handle YouTube Data API quota limits. When one key hits its daily quota, the system automatically rotates to the next available key. You can configure 1-6 keys in the `.env` file.
