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
    '«redacted:AIza…»',
    '«redacted:AIza…»',
    '«redacted:AIza…»',
    '«redacted:AIza…»',
    '«redacted:AIza…»',
    '«redacted:AIza…»'
];

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

function youtubeSearch(req, res) {
    const q = req.query.q;
    if (!q) {
        return res.status(400).send({ error: 'missing q' });
    }
    const url = 'https://www.googleapis.com/youtube/v3/search?key=' + google_api_keys[0] + '&type=video&q=' + encodeURIComponent(q) + '&part=snippet&videoEmbeddable=true';
    request.get({ url, json: true }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            res.send(body);
        } else {
            res.status(500).send(body || { error: 'youtube_search_failed' });
        }
    });
}

function youtubeVideoStatus(req, res) {
    const id = req.query.id;
    if (!id) {
        return res.status(400).send({ error: 'missing id' });
    }
    const url = 'https://www.googleapis.com/youtube/v3/videos?key=' + google_api_keys[0] + '&part=status&id=' + encodeURIComponent(id);
    request.get({ url, json: true }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            res.send(body);
        } else {
            res.status(500).send(body || { error: 'youtube_status_failed' });
        }
    });
}

app.get('/youtube/search', youtubeSearch);
app.get('/youtube/video_status', youtubeVideoStatus);

app.listen(8080);
