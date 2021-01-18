> Fetch songs from https://www.srf.ch/radio-srf-3/gespielte-musik and crate a spotify playlist for each day.  

# Usage
Create spotify app https://developer.spotify.com/documentation/general/guides/app-settings/#register-your-app and create file `spotify_credentials.json`

# TODO
- Use refresh-token for automatic login to spotify. Currently the tokens are only valid for a few minutes. 
- Wrap it in a docker container so it can be executed automatically. 
- Error handling when creating the spotify playlist. 

# Used resources: 
 - https://dev.to/tusharpandey13/getting-on-with-es6-nodejs-eslint-without-babel-4ip7
 - https://github.com/xojs/xo
