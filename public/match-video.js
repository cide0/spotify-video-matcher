(function() {
    // 10.000 because this is in milliseconds
    const windowInterval = 10000;
    // add this from the Spotify song playtime to account for network traffic delay and the time it takes to load the video
    const networkTrafficDelay = 1350;
    // the time that should be subtracted to account for the network traffic delay when setting the timeout to instantly load the new song after a switch
    const networkTrafficDelayForSongSwitch = 28000;

    let rickrolled = true;
    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
        let hashParams = {};
        let e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    let params = getHashParams();

    // fetch the Tokens or the Error from the redirect url after trying to log in with Spotify
    let access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    // says if the youtube video is currently paused or not
    let video_playing = true;

    //says if a song specific timeout to fetch the next song exactly when the current one ends has already been set
    let song_specific_timeout_set = false;

    function loadVideo(refresh_token){
        const song_search_string_element = document.getElementById('song_search_string');
        const music_video_element = document.getElementById('music-video');
        const login_btn = document.getElementById('login-btn');
        let current_results = [];

        //always refresh the Spotify auth Token first
        $.ajax({
            url: '/refresh_token',
            data: {
                'refresh_token': refresh_token
            }
        }).done(function(data) {
            access_token = data.access_token;
        });

        function playResult(song_search_string, music_video_element, song_progress){
            // get the first found result from the Youtube API
            let item = current_results[0];
            let video_id = item.id.videoId;
            music_video_element.src = "https://www.youtube.com/embed/" + video_id + "?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=" + video_id + "&start=" + Math.trunc((song_progress+networkTrafficDelay)/1000);
        }

        function searchAndPlay(song_search_string, music_video_element, song_progress){
            // get the video for the current song from Youtube
            $.ajax({
                url: '/youtube_search?q=' + song_search_string,
                success: function(response) {
                    current_results = response.items;
                    playResult(song_search_string, music_video_element, song_progress);
                },
                error: function(response){
                    // this code means that all API keys have expired
                    if(response.status === 429) {
                        alert('All google api keys have been used up for today :(');
                    } else {
                        console.error('YouTube search failed:', response);
                    }
                }
            });
        }

        // get currently playing song from Spotify
        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                if(!response){
                    // if there is currently no song playing, show this message
                    login_btn.textContent = 'Start listening to spotify!';
                }
                else {
                    // if there is a song currently playing, get its details
                    let song_name = response.item.name;
                    let artist = response.item.artists[0].name;
                    let song_length = +response.item.duration_ms;
                    let song_progress = +response.progress_ms;
                    let song_playing = response.is_playing;

                    let song_search_string = encodeURIComponent(song_name + ' by ' + artist + ' music video');

                    // get the current song stored in the invisible HTML element
                    let current_song = song_search_string_element.innerHTML

                    // if the found song and the stored song in the HTML are not the same, then the song switched
                    if(current_song !== song_search_string){
                        searchAndPlay(song_search_string, music_video_element, song_progress);
                        song_search_string_element.innerHTML = song_search_string;
                        //reset the song specific timeout toggle as a new song is played now
                        song_specific_timeout_set = false;
                    // if they are the same, the current video is already the correct one, but we can try to set a timeout so that we try to load a new video exactly when the song is over
                    } else {
                        if(!song_specific_timeout_set) {
                            let song_remaining_length = song_length - song_progress - networkTrafficDelayForSongSwitch;
                            setTimeout(function(){
                                loadVideo(refresh_token);
                            }, song_remaining_length);

                            // we only want to set this custom timeout once per song, if not the call count would grow huge as it always sets to call itself
                            song_specific_timeout_set = true;
                        }
                    }

                    // if the song is paused in Spotify, but the video is still playing, pause the video as well
                    if(!song_playing && video_playing){
                        //has to be in a 1 second timeout as it doesn't work otherwise
                        setTimeout(function(){
                            $('.music-video').each(function(){
                                this.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*')
                            });
                            //set video to not playing anymore
                            video_playing = false;
                        }, 1000);
                    }

                    // if the song is playing in Spotify, but the video is paused, start the video again
                    if(song_playing && !video_playing){
                        let video_start = Math.trunc((song_progress+networkTrafficDelay)/1000);
                        let new_video_src = music_video_element.src;
                        //remove the current start param if its already in URL, so that the new one can be applied
                        if(new_video_src.includes('&start=')){
                            let start_param_index = new_video_src.indexOf('&start=');
                            new_video_src = new_video_src.slice(0, start_param_index);
                        }
                        music_video_element.src = new_video_src + "&start=" + video_start;
                        //set video to playing again
                        video_playing = true;
                    }

                    //rick-roll logic
                    let date = new Date();
                    let h = date.getHours();
                    let m = date.getMinutes();

                    if((h === 10 && m === 30)
                    ){
                        if(!rickrolled){
                            if(music_video_element.src !== "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&controls=0&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=dQw4w9WgXcQ"){
                                music_video_element.src = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&controls=0&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=dQw4w9WgXcQ";
                            }
                            music_video_element.style.pointerEvents = "none";
                            song_search_string_element.innerHTML = "Never%20Gonna%20Give%20You%20Up%20by%20Rick%20Astley%20music%20video";
                            $.ajax({
                                url: '/rickroll',
                                data: {
                                    'uri': 'spotify:track:4PTG3Z6ehGkBFwjybzWkR8',
                                    'access_token': access_token
                                }
                            });
                            rickrolled = true;
                        }
                    } else {
                        music_video_element.style.pointerEvents = "auto";
                        //rickrolled = false; comment in to enable
                    }

                    $('#login').hide();
                    $('#loggedin').show();
                }
            }
        });
    }

    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {
            // initial loading of the first video
            loadVideo(refresh_token)
            // interval to keep re-fetching Spotify info
            window.setInterval(function(){
                loadVideo(refresh_token)
            }, windowInterval);
        } else {
            // render initial login screen
            $('#login').show();
            $('#loggedin').hide();
        }
    }
})();