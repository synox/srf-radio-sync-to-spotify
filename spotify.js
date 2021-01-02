const SpotifyWebApi = require('spotify-web-api-node');
const Cache = require('async-disk-cache')
const trackCache = new Cache('spotify-tracks');


cleanupTitle = function (name) {
    return name
        .replaceAll("'", " ")
        .replaceAll(/\bUND\b|\bAND\b/g, " ")
        .replaceAll(/\bODER\b|\bOR\b/g, " ")
        .replaceAll(/\bNICHT\b|\bNOT\b/g, " ")
}
cleanupArtist = function (name) {
    return name
        .replaceAll(/FEAT[.]?/g, " ")
        .replaceAll("/", " ")
        .replaceAll("'", " ")
        .replaceAll(/\bUND\b|\bAND\b/g, " ")
        .replaceAll(/\bODER\b|\bOR\b/g, " ")
        .replaceAll(/\bNICHT\b|\bNOT\b/g, " ")
}
removeFeatArtist = function (name) {
    return name
        .replaceAll(/FEAT.*/g, " ")
        .replaceAll(/[/].*$/g, "")
}


async function findSongCached(query) {
    if (await trackCache.has(query)) {
        let cached = await trackCache.get(query)
        const trackId = cached.value
        if (trackId === "NOT_FOUND") {
            return null;
        }
        return `spotify:track:${trackId}`
    }

    const track = await spotifyApi.searchTracks(query, {limit: 1})
    if (track.body.tracks.items.length === 0) {
        await trackCache.set(query, "NOT_FOUND")
        return null;
    }
    let trackId = track.body.tracks.items[0].id
    await trackCache.set(query, trackId)
    return trackId;
}

/**
 *
 * @param songs e.g. [{artist: "Samim", title: "heater"}]
 */
module.exports.findSongs = async function (songs) {
    const result = []
    for (const song of songs) {

        let artist = cleanupArtist(song.artist)
        let title = cleanupTitle(song.title)
        let query = `track:${title} artist:${artist}`

        let trackId = await findSongCached(query)
        if (!trackId) {
            // retry without feat. artists
            artist = cleanupArtist(removeFeatArtist(song.artist))
            query = `track:${title} artist:${artist}`
            trackId = await findSongCached(query)
            if (trackId) {
                console.log("found without feat. on second try: ", song, query)
            } else {
                console.log("not found after 2 tries: ", song, query)
            }
        }
        if (trackId) {
            result.push(`spotify:track:${trackId}`)
        }
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