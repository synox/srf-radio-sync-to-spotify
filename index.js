const srf = require("./srf.js")
const spotify = require("./spotify.js")
let spotifyCredentials = require('./spotify_credentials.json');


async function main(channel, fromDate, toDate) {

    // spotify.startLoginWorkflow(spotifyCredentials);
    spotify.login(spotifyCredentials)

    const songs = await srf.getPlaylist(channel, fromDate, toDate)
    console.log(songs)

    const spotifyTrackIds = await spotify.findSongs(songs)
    console.log(spotifyTrackIds)

    const name = `SRF 3 ${fromDate}`
    // if ( spotify.userPlaylistExists(name) ) {
    //     console.log("playlist already exists, stopped")
    //     return;
    // }
    spotify.createPlaylist(name, spotifyTrackIds);
}

main(srf.channelIds.srfRadio3, "2020-12-29", "2020-12-29");


function askOnce(question) {
    const stdin = process.stdin, stdout = process.stdout

    stdin.resume();
    stdout.write(question + ": ");

    return new Promise(res => {
        stdin.once('data', function (data) {
            res(data.toString().trim());
        });
    });
}




