const srf = require("./srf.js")
const spotify = require("./spotify.js")
let spotifyCredentials = require('./spotify_credentials.json');


async function main() {
    // spotify.startLoginWorkflow(spotifyCredentials);
    spotify.login(spotifyCredentials)

    await copyToSpotify(srf.channelIds.srfRadio3, "2021-01-01")
}

async function copyToSpotify(channel, fromDate) {
    const name = `SRF 3 ${fromDate}`
    if (spotify.userPlaylistExists(name)) {
        console.log("playlist already exists, stopped")
        return;
    }

    const songs = await srf.getPlaylist(channel, fromDate, fromDate)

    const spotifyTrackIds = await spotify.findSongs(songs)

    spotify.createPlaylist(name, spotifyTrackIds);
}

main();
