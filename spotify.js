const SpotifyWebApi = require('spotify-web-api-node');
const Cache = require('async-disk-cache')
const trackCache = new Cache('spotify-tracks');

/**
 *
 * @param songs e.g. [{artist: "Samim", title: "heater"}]
 */
module.exports.findSongs = async function (songs) {
    const result = []
    for (const song of songs) {
        let query = `track:${song.title} artist:${song.artist}`

        if (await trackCache.has(query)) {
            let cached = await trackCache.get(query)
            const trackId = cached.value
            if (trackId === "NOT_FOUND") {
                continue;
            } else {
                result.push(`spotify:track:${trackId}`)
            }
            continue;
        }

        const track = await spotifyApi.searchTracks(query, {limit: 1})
        if (track.body.tracks.items.length === 0) {
            console.log("not found: ", song)
            await trackCache.set(query, "NOT_FOUND")
            continue;
        }
        let trackId = track.body.tracks.items[0].id
        await trackCache.set(query, trackId)
        result.push(`spotify:track:${trackId}`)
    }
    return result
}

module.exports.userPlaylistExists = async function (playlistName) {
    const userId = (await spotifyApi.getMe()).body.id
    const playlists = await spotifyApi.getUserPlaylists(userId)
    return playlists.body.items.find(item => item.name === playlistName) != null

}

function chunkArray(array, size) {
    let result = []
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size)
        result.push(chunk)
    }
    return result
}

module.exports.createPlaylist = async function (playlistName, trackIds) {
    let playlist = (await spotifyApi.createPlaylist(playlistName, {
        'description': 'My description',
        'public': false
    })).body
    console.log('Created playlist!');

    console.log("songs", trackIds)
    for (const chunk of chunkArray(trackIds, 100)) {
        console.log("Chunk", chunk)
        spotifyApi.addTracksToPlaylist(playlist.id, chunk)
        console.log("added chunk of tracks:", chunk)
    }
    console.log("added all tracks")
}

let spotifyApi = null;

const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative',
]
const redirectUri = 'https://example.com/callback'
const state = 'some-state-of-my-choice'
const showDialog = true
const responseType = 'token'

module.exports.login = function (spotifyCredentials) {
    spotifyApi = new SpotifyWebApi({
        clientId: spotifyCredentials.clientId,
        clientSecret: spotifyCredentials.clientSecret,
        accessToken: spotifyCredentials.accessToken,
        redirectUri
    })
}

module.exports.startLoginWorkflow = function (spotifyCredentials) {
    spotifyApi = new SpotifyWebApi({
        clientId: spotifyCredentials.clientId,
        clientSecret: spotifyCredentials.clientSecret,
        // accessToken: spotifyCredentials.accessToken,
        redirectUri
    })

    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state, showDialog, responseType)
    console.log(authorizeURL)
    console.log("exiting process, please update spotify_credentials.json with the accessToken")
    process.exit()

    // const accessToken = await askOnce("What is the code?");
    // spotifyApi.setAccessToken(accessToken);
}