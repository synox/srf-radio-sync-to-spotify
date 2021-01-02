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
        .replaceAll("&", " ")
        .replaceAll(",", " ")
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
        return trackId
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
                console.log("found without feat.: ", song, query)
            } else {
                console.error("not found", song, query)
            }
        }
        if (trackId) {
            result.push(
                {id: `spotify:track:${trackId}`, artist: song.artist, title: song.title}
            )
        }
    }
    return result
}

module.exports.userPlaylistExists = async function (playlistName) {
    const userId = (await spotifyApi.getMe()).body.id
    const playlists = await spotifyApi.getUserPlaylists(userId)
    let playlist = playlists.body.items.find(item => item.name === playlistName)
    return !!playlist

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
        'public': true
    })).body
    console.log('Created playlist!');

    let chunks = chunkArray(trackIds, 100)
    for (const chunk of chunks) {
        let trackIds = chunk.map(entry => entry.id)
        await spotifyApi.addTracksToPlaylist(playlist.id, trackIds)
        console.log("added chunk of tracks")
    }
    console.log(`added all ${trackIds.length} tracks`)
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

module.exports.login = async function (spotifyCredentials) {
    spotifyApi = new SpotifyWebApi({
        clientId: spotifyCredentials.clientId,
        clientSecret: spotifyCredentials.clientSecret,
        accessToken: spotifyCredentials.accessToken,
        redirectUri
    })

    // verify that it works
    await spotifyApi.getMe()
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