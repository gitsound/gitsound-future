import SpotifyWebApi from 'spotify-web-api-node'

const state = {
  userId: null,
}
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
})

const getAuthURL = () => {
  const authorizeURL = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email'], 'hello-world')

  return authorizeURL
}

const saveUserAuth = async (code) => {
  try {
    const data = await spotifyApi.authorizationCodeGrant(code)

    spotifyApi.setAccessToken(data.body.access_token)
    spotifyApi.setRefreshToken(data.body.refresh_token)
  } catch (err) {
    console.error(err)
  }
}

const getUser = async () => {
  const user = await spotifyApi.getMe()
  return user
}

const userAuthCallback = (id) => {
  state.userId = id
}

export default {
  getAuthURL,
  userAuthCallback,
  saveUserAuth,
  getUser,
  raw: spotifyApi,
}
