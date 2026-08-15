const express = require('express');
const request = require('request');
const crypto = require('crypto');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const client_id = '214db4ea83c34690a9f80d791c703f25';
const client_secret = '44d327094e59489999883e9f18e6ebdc';
const base_url = 'http://192.168.2.147:8080'

const google_api_keys = [
    'AIzaSyAqFDCw0aurq3G33lsyMU1Rsmx0jUBo9WI',
    'AIzaSyCYVvBN8U_Mh8kEHdIj8YgKPs1qyJZgSNQ',
    'AIzaSyAQMjIEzOswbjYCZ2NvzpGePboQCMsnfno',
    'AIzaSyCzW4obvmVSGFJlDOFgeEmHOT8fJZgJQ1Q',
    'AIzaSyAL2Uxkv5kHMrcl-uPNicgEUUT2z3nLYpM',
    'AIzaSyBIB6-WO1ZW4jn-aOXmAJPliFUW-_yypFQ'
];

let current_google_api_key_index = 0;

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
    var search_query = req.query.q;
    
    if (!search_query) {
        return res.status(400).json({ error: 'Missing search query parameter' });
    }
    
    if (current_google_api_key_index >= google_api_keys.length) {
        return res.status(429).json({ error: 'All Google API keys have been exhausted' });
    }
    
    function trySearch(keyIndex) {
        if (keyIndex >= google_api_keys.length) {
            return res.status(429).json({ error: 'All Google API keys have been exhausted' });
        }
        
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
                return res.status(500).json({ error: 'Request failed', details: error.message });
            }
            
            if (response.statusCode === 403 && body.error && body.error.message && 
                body.error.message.includes('The request cannot be completed because you have exceeded your')) {
                // Rate limit hit, try next key
                current_google_api_key_index = keyIndex + 1;
                trySearch(current_google_api_key_index);
            } else if (response.statusCode === 200) {
                res.json(body);
            } else {
                res.status(response.statusCode).json(body);
            }
        });
    }
    
    trySearch(current_google_api_key_index);
});

app.listen(8080);