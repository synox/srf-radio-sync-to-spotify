import SpotifyWebApi from 'spotify-web-api-node'
import Cache from 'async-disk-cache'

const trackCache = new Cache('spotify-tracks')
let spotifyApi = null

const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative'
]
const redirectUri = 'https://example.com/callback'
const state = 'some-state-of-my-choice'
const showDialog = true
const responseType = 'token'

const cleanupTitle = function (name) {
    return name
        .replaceAll("'", ' ')
        .replaceAll(/\bUND\b|\bAND\b/g, ' ')
        .replaceAll(/\bODER\b|\bOR\b/g, ' ')
        .replaceAll(/\bNICHT\b|\bNOT\b/g, ' ')
}

const cleanupArtist = function (name) {
    return name
        .replaceAll(/FEAT\.?/g, ' ')
        .replaceAll('/', ' ')
        .replaceAll('&', ' ')
        .replaceAll(',', ' ')
        .replaceAll("'", ' ')
        .replaceAll(/\bUND\b|\bAND\b/g, ' ')
        .replaceAll(/\bODER\b|\bOR\b/g, ' ')
        .replaceAll(/\bNICHT\b|\bNOT\b/g, ' ')
}

const removeFeatArtist = function (name) {
    return name.replaceAll(/FEAT.*/g, ' ').replaceAll(/\/.*$/g, '')
}

async function findSongCached(query) {
    if (await trackCache.has(query)) {
        const cached = await trackCache.get(query)
        const trackId = cached.value
        if (trackId === 'NOT_FOUND') {
            return null
        }

        return trackId
    }

    const track = await spotifyApi.searchTracks(query, {limit: 1})
    if (track.body.tracks.items.length === 0) {
        await trackCache.set(query, 'NOT_FOUND')
        return null
    }

    const trackId = track.body.tracks.items[0].id
    await trackCache.set(query, trackId)
    return trackId
}

/**
 *
 * @param songs e.g. [{artist: "Samim", title: "heater"}]
 */
export async function findSongs(songs) {
    const result = []
    for (const song of songs) {
        let artist = cleanupArtist(song.artist)
        const title = cleanupTitle(song.title)
        let query = `track:${title} artist:${artist}`

        let trackId = await findSongCached(query)
        if (!trackId) {
            // Retry without feat. artists
            artist = cleanupArtist(removeFeatArtist(song.artist))
            query = `track:${title} artist:${artist}`
            trackId = await findSongCached(query)
            if (trackId) {
                console.log('found without feat.:', song, query)
            } else {
                console.error('not found', song, query)
            }
        }

        if (trackId) {
            result.push({
                id: `spotify:track:${trackId}`,
                artist: song.artist,
                title: song.title
            })
        }
    }

    return result
}

export async function userPlaylistExists(playlistName) {
    const userId = (await spotifyApi.getMe()).body.id
    const playlists = await spotifyApi.getUserPlaylists(userId)
    const playlist = playlists.body.items.find(
        (item) => item.name === playlistName
    )
    return Boolean(playlist)
}

function chunkArray(array, size) {
    const result = []
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size)
        result.push(chunk)
    }

    return result
}

export async function createPlaylist(playlistName, trackIds) {
    const playlist = (
        await spotifyApi.createPlaylist(playlistName, {
            description: 'My description',
            public: true
        })
    ).body
    console.log('Created playlist!')

    const chunks = chunkArray(trackIds, 100)
    for (const chunk of chunks) {
        const trackIds = chunk.map((entry) => entry.id)
        await spotifyApi.addTracksToPlaylist(playlist.id, trackIds)
        console.log('added chunk of tracks')
    }

    console.log(`added all ${trackIds.length} tracks`)
}




export async function login(spotifyCredentials) {
    spotifyApi = new SpotifyWebApi({
        clientId: spotifyCredentials.clientId,
        clientSecret: spotifyCredentials.clientSecret,
        accessToken: spotifyCredentials.accessToken,
        redirectUri
    })

    // Verify that it works
    await spotifyApi.getMe()
}

export async function startLoginWorkflow(spotifyCredentials) {
    spotifyApi = new SpotifyWebApi({
        clientId: spotifyCredentials.clientId,
        clientSecret: spotifyCredentials.clientSecret,
        // AccessToken: spotifyCredentials.accessToken,
        redirectUri
    })

    const authorizeURL = spotifyApi.createAuthorizeURL(
        scopes,
        state,
        showDialog,
        responseType
    )
    console.log(authorizeURL)
    console.log(
        'exiting process, please update spotify_credentials.json with the accessToken'
    )
    process.exit()

    // Const accessToken = await askOnce("What is the code?");
    // spotifyApi.setAccessToken(accessToken);
}
