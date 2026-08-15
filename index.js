const express = require('express');
const request = require('request');
const crypto = require('crypto');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
require('dotenv').config({ override: true });

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const base_url = process.env.BASE_URL;

const google_api_keys = [
    process.env.GOOGLE_API_KEY_1,
    process.env.GOOGLE_API_KEY_2,
    process.env.GOOGLE_API_KEY_3,
    process.env.GOOGLE_API_KEY_4,
    process.env.GOOGLE_API_KEY_5,
    process.env.GOOGLE_API_KEY_6
].filter(key => key); // Filter out undefined keys

let current_google_api_key_index = 0;

// Log loaded keys on startup
console.log(`Loaded ${google_api_keys.length} Google API keys`);
if (google_api_keys.length === 0) {
    console.error('WARNING: No Google API keys loaded! Check environment variables.');
}

const generateRandomString = (length) => {
    return crypto
        .randomBytes(60)
        .toString('hex')
        .slice(0, length);
}

var stateKey = 'spotify_auth_state';

const app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());
app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state, { httpOnly: true, path: '/', maxAge: 600000, sameSite: 'lax' });
    const scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-modify-playback-state';
    const redirect_uri = base_url + '/callback';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    const redirect_uri = base_url + '/callback';

    if (state === null || state !== storedState) {
        res.clearCookie(stateKey, { path: '/' });
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey, { path: '/' });
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                const spotifyError = body && body.error_description ? body.error_description : (body && body.error ? JSON.stringify(body.error) : 'unknown_error');
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token',
                        error_description: spotifyError
                    }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token,
                refresh_token = body.refresh_token;
            res.send({
                'access_token': access_token,
                'refresh_token': refresh_token
            });
        }
    });
});

app.get('/rickroll', function(req, res){
    var vid_uri = req.query.uri;
    var access_token = req.query.access_token;
    var authOptions = {
        url: 'https://api.spotify.com/v1/me/player/queue?uri=' + vid_uri,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + access_token
        }
    };

    request.post(authOptions, function(error, response, body) {
        if (!error) {
            var authOptionsSkip = {
                url: 'https://api.spotify.com/v1/me/player/next',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Bearer ' + access_token
                }
            };

            request.post(authOptionsSkip, function(error, response, body) {});
        }
    });
});

app.get('/youtube_search', function(req, res){
    console.log('=== YouTube search request received ===');
    console.log('Query:', req.query.q);
    console.log('Current key index:', current_google_api_key_index);
    console.log('Total keys available:', google_api_keys.length);
    
    var search_query = req.query.q;
    
    if (!search_query) {
        console.log('ERROR: Missing search query');
        return res.status(400).json({ error: 'Missing search query parameter' });
    }
    
    if (google_api_keys.length === 0) {
        console.log('ERROR: No API keys configured');
        return res.status(500).json({ error: 'No Google API keys configured on server' });
    }
    
    // Reset index if it's out of bounds (safety check)
    if (current_google_api_key_index >= google_api_keys.length) {
        console.log('RESET: Index was out of bounds, resetting to 0');
        current_google_api_key_index = 0;
    }
    
    console.log('Starting search with index:', current_google_api_key_index);
    
    function trySearch(keyIndex) {
        console.log(`trySearch called with keyIndex: ${keyIndex}`);
        
        if (keyIndex >= google_api_keys.length) {
            console.log('All API keys exhausted, attempted keys:', google_api_keys.length);
            // Reset for next request
            current_google_api_key_index = 0;
            return res.status(429).json({ error: 'All Google API keys have been exhausted' });
        }
        
        console.log(`Trying YouTube search with key index ${keyIndex}/${google_api_keys.length - 1}`);
        
        var searchOptions = {
            url: 'https://www.googleapis.com/youtube/v3/search',
            qs: {
                key: google_api_keys[keyIndex],
                type: 'video',
                q: search_query,
                part: 'snippet',
                videoEmbeddable: 'true'
            },
            json: true
        };
        
        request.get(searchOptions, function(error, response, body) {
            if (error) {
                console.error('YouTube API request error:', error.message);
                return res.status(500).json({ error: 'Request failed', details: error.message });
            }
            
            console.log('YouTube API response status:', response.statusCode);
            
            // Check for quota/rate limit errors (both 403 and 429)
            var isQuotaError = (response.statusCode === 403 || response.statusCode === 429) && 
                               body.error && body.error.message &&
                               (body.error.message.includes('quota') || 
                                body.error.message.includes('Quota') ||
                                body.error.message.includes('exceeded') ||
                                body.error.message.toLowerCase().includes('limit'));
            
            if (isQuotaError) {
                // Rate limit hit, try next key
                console.log(`Key ${keyIndex} quota exceeded (${response.statusCode}), trying next key`);
                var nextIndex = keyIndex + 1;
                current_google_api_key_index = nextIndex;
                trySearch(nextIndex);
            } else if (response.statusCode === 200) {
                console.log('SUCCESS: Video found');
                res.json(body);
            } else {
                console.error('YouTube API error:', response.statusCode, body);
                res.status(response.statusCode).json(body);
            }
        });
    }
    
    trySearch(current_google_api_key_index);
});

app.listen(process.env.PORT || 8080, '0.0.0.0', () => {
    console.log(`Server running on port ${process.env.PORT || 8080}`);
});