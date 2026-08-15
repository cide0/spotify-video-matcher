(function() {
    google_api_keys = [
        'AIzaSyAqFDCw0aurq3G33lsyMU1Rsmx0jUBo9WI',
        'AIzaSyCYVvBN8U_Mh8kEHdIj8YgKPs1qyJZgSNQ',
        'AIzaSyAQMjIEzOswbjYCZ2NvzpGePboQCMsnfno',
        'AIzaSyCzW4obvmVSGFJlDOFgeEmHOT8fJZgJQ1Q',
        'AIzaSyAL2Uxkv5kHMrcl-uPNicgEUUT2z3nLYpM',
        'AIzaSyBIB6-WO1ZW4jn-aOXmAJPliFUW-_yypFQ'
    ];

    let rickrolled = true;
    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    let video_playing = true;

    function retryLoadingVideo(response, song_search_string, music_video_element, song_progress){
        let message = response.responseJSON.error.message;
        if(message.includes('The request cannot be completed because you have exceeded your')){
            google_api_keys.shift();
            if(google_api_keys.length === 0){
                alert('All google api keys have been used up for today :(');
            } else {
                $.ajax({
                    url: 'https://www.googleapis.com/youtube/v3/search?key=' + google_api_keys[0] + '&type=video&q=' + song_search_string + '&part=snippet&videoEmbeddable=true',
                    success: function (response) {
                        let video_id = response.items[0].id.videoId;
                        music_video_element.src = "https://www.youtube.com/embed/" + video_id + "?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=" + video_id + "&start=" + Math.trunc((song_progress + 1400) / 1000) + "&origin=" + encodeURIComponent(window.location.origin);
                    },
                    error: function (response){
                        retryLoadingVideo(response, song_search_string, music_video_element, song_progress);
                    }
                });
            }
        }
    }

    function loadVideo(refresh_token){
        const song_search_string_element = document.getElementById('song_search_string');
        const music_video_element = document.getElementById('music-video');
        const login_btn = document.getElementById('login-btn');
        let current_song_query = null;
        let current_results = [];
        let result_index = 0;

        $.ajax({
            url: '/refresh_token',
            data: {
                'refresh_token': refresh_token
            }
        }).done(function(data) {
            access_token = data.access_token;
        });

        function playResult(song_search_string, music_video_element, song_progress){
            if (result_index >= current_results.length) {
                result_index = 0;
                current_results = [];
                return;
            }
            let item = current_results[result_index];
            let video_id = item.id.videoId;
            music_video_element.src = "https://www.youtube.com/embed/" + video_id + "?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=" + video_id + "&start=" + Math.trunc((song_progress+1400)/1000) + "&origin=" + encodeURIComponent(window.location.origin);
        }

        function searchAndPlay(song_search_string, music_video_element, song_progress){
            $.ajax({
                url: 'https://www.googleapis.com/youtube/v3/search?key=' + google_api_keys[0] +'&type=video&q=' + song_search_string + '&part=snippet&videoEmbeddable=true',
                success: function(response) {
                    current_results = response.items || [];
                    result_index = 0;
                    if (current_results.length === 0) {
                        return;
                    }
                    playResult(song_search_string, music_video_element, song_progress);
                },
                error: function(response){
                    retryLoadingVideo(response, song_search_string, music_video_element, song_progress);
                }
            });
        }

        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                if(!response){
                    login_btn.textContent = 'Start listening to spotify!';
                }
                else {
                    let song_name = response.item.name;
                    let artist = response.item.artists[0].name;
                    let song_length = +response.item.duration_ms;
                    let song_progress = +response.progress_ms;
                    let song_playing = response.is_playing;

                    let song_search_string = encodeURIComponent(song_name + ' by ' + artist + ' music video');

                    let current_song = song_search_string_element.innerHTML

                    if(current_song !== song_search_string){
                        song_search_string_element.innerHTML = song_search_string;
                        search_attempt = 0;
                        searchAndPlay(song_search_string, music_video_element, song_progress);
                    } else {
                        let song_remaining_length = song_length - song_progress - 28500;
                        setTimeout(function(){
                            loadVideo(refresh_token);
                        }, song_remaining_length);
                    }

                    if(!song_playing && video_playing){
                        setTimeout(function(){
                            $('.music-video').each(function(){
                                this.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*')
                            });
                            video_playing = false;
                        }, 1000);
                    }

                    if(song_playing && !video_playing){
                        let video_start = Math.trunc((song_progress+1400)/1000);
                        let new_video_src = music_video_element.src;
                        if(new_video_src.includes('&start=')){
                            let start_param_index = new_video_src.indexOf('&start=');
                            new_video_src = new_video_src.slice(0, start_param_index);
                        }
                        music_video_element.src = new_video_src + "&start=" + video_start;
                        video_playing = true;
                    }

                    let date = new Date();
                    let h = date.getHours();
                    let m = date.getMinutes();

                    if((h === 10 && m === 30)
                    ){
                        if(!rickrolled){
                            if(music_video_element.src !== "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&controls=0&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=dQw4w9WgXcQ&origin=" + encodeURIComponent(window.location.origin)){
                                music_video_element.src = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&vq=hd1080&enablejsapi=1&controls=0&version=3&playerapiid=ytplayer&cc_lang_pref=en&iv_load_policy=3&loop=1&playlist=dQw4w9WgXcQ&origin=" + encodeURIComponent(window.location.origin);
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
                        //rickrolled = false;
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
            loadVideo(refresh_token)
            window.setInterval(function(){
                loadVideo(refresh_token)
            }, 10000);
        } else {
            // render initial screen
            $('#login').show();
            $('#loggedin').hide();
        }
    }
})();