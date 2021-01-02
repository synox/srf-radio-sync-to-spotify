import srf from './srf.js'
import {
    startLoginWorkflow,
    login,
    createPlaylist,
    userPlaylistExists,
    findSongs
} from './spotify.js'
import spotifyCredentials from './spotify_credentials.json'

async function main() {
    try {
        await login(spotifyCredentials)
    } catch (error) {
        console.error('error on login', error)
        startLoginWorkflow(spotifyCredentials)
    }

    await copyToSpotify(srf.channelIds.srfRadio3, '2021-01-01')
}

async function copyToSpotify(channel, fromDate) {
    const name = `SRF 3 ${fromDate}`
    if (await userPlaylistExists(name)) {
        console.log('playlist already exists, stopped')
        return
    }

    console.log(`### fetching ${name} ###`)
    const songs = await srf.getPlaylist(channel, fromDate, fromDate)

    const spotifyTracks = await findSongs(songs)

    await createPlaylist(name, spotifyTracks)
}

main()
