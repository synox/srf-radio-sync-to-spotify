import fetch from "node-fetch"

const channelIds = {
    srfRadioVirus: "66815fe2-9008-4853-80a5-f9caaffdf3a9",
    srfRadio3: "dd0fa1ba-4ff6-4e1a-ab74-d7e49057d96f",
}

/**
 *
 * @param channel
 * @param fromDate
 * @param toDate
 * @returns {Promise<{title, artist}>}
 */
const getPlaylist = async function (channel, fromDate, toDate) {
    /*
    {
  songList: [
    {
      isPlayingNow: false,
      date: '2020-12-29T23:55:52+01:00',
      duration: 251483,
      title: 'HURRICANE LAUGHTER',
      artist: [Object]
    },
    ...
    ]
   }
     */
    let url = `https://il.srgssr.ch/integrationlayer/2.0/srf/songList/radio/byChannel/${channel}?from=${fromDate}T00%3A00%3A00%2B01%3A00&to=${toDate}T23%3A59%3A00%2B01%3A00&pageSize=500`
    console.log("fetching ", url)
    const response = await fetch(url, {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:84.0) Gecko/20100101 Firefox/84.0",
        },
        "method": "GET",
    })
    const data = JSON.parse(await response.text());
    return data.songList
        .map(entry => {
            return {title: entry.title, artist: entry.artist.name}
        })
        .reverse() // the api provides the songs in newest-to-oldest order
}

export default {getPlaylist, channelIds};