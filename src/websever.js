import opn from 'opn'
import express from 'express'
import spotify from './spotify'


// takes a function as an input to return the new user Auth Id
export const getUserAuthTokenFromWeb = () => new Promise((resolve) => {
  const state = {
    gotAuth: false,
  }

  const server = express()
  const port = process.env.PORT

  const serverInstance = server.listen(port, () => {
    console.log(`express server started on ${port}`)

    const authURL = spotify.getAuthURL()
    console.log('openning spotify redirect in default browser')
    opn(authURL)
  })

  server.get('/callback', (req, res) => {
    if (state.gotAuth === false) {
      const userAuth = req.query.code

      state.gotAuth = true

      serverInstance.close(() => {
        console.log('express shutting down')
        resolve(userAuth)
      })
    }
    res.send('You can close this window now 😀')
  })
})

export default {
  getUserAuthTokenFromWeb,
}
