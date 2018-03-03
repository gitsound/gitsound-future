import readFile from 'fs-readfile-promise'
import path from 'path'
import git from 'nodegit'
import json5 from 'json5'
import fs from 'fs'
import { getUserAuthTokenFromWeb } from './websever'
import spotify from './spotify'


const filePrefix = './git-repos'
const repoName = 'test2'
const fullPath = `${filePrefix}/${repoName}`

const createRepo = async () => {
  const isBare = 0

  return await git.Repository.init(fullPath, isBare)
}

const openRepo = async () => {
  return await git.Repository.open(fullPath)
}

// (async () => {

// const newRepo = await createRepo()

// console.log(newRepo)

// const repo = await openRepo()

// console.log(repo)

// })()

const simpleState = (state = {}) => {
  let privateState = Object.assign({}, state)

  const setState = (newState = {}) => {
    privateState = Object.assign(privateState, newState)
  }

  return ({
    state: privateState,
    setState,
  })
}

const getRawPlaylist = async (playlistPath) => {
  const content = await readFile(`${playlistPath}/index.json`, 'utf8')
  return content
}

const LocalUser = (playlistPath) => {
  const { state, setState } = simpleState({
    authToken: null,
  })

  const getInfo = async () => {
    if (state.authToken === null) {
      const rawContent = await readFile(`${playlistPath}/user.json`, 'utf8')
      const content = json5.parse(rawContent)
      setState(content)
    }

    return state
  }

  const setInfo = async (newState = {}) => {
    setState(newState)

    fs.writeFileSync(`${playlistPath}/user.json`, json5.stringify(state), (err) => {
      if (err) {
        console.error(err)
      }
    })
  }

  return {
    getInfo,
    setInfo,
  }
}

const getUserAuth = async (playlistPath) => {
  const localUser = LocalUser(playlistPath)
  // const { authToken } = await localUser.getInfo(playlistPath)

  // if (authToken !== null) {
  //   return authToken
  // }

  const userAuth = await getUserAuthTokenFromWeb()

  await localUser.setInfo({ authToken: userAuth })

  return userAuth
}

const getRepoPlaylist = async (rawPath) => {
  const raw = await getRawPlaylist(rawPath)

  return json5.parse(raw)
}

const handleTracks = rawTracks =>
  rawTracks.map((track) => {
    const { added_at: addedAt, track: { id } } = track
    return {
      id,
      addedAt,
    }
  })

const handlePlaylists = async rawPlaylists =>
  rawPlaylists.map(async (playlist) => {
    const { id, owner } = playlist
    const {
      body: { items },
    } = await spotify.raw.getPlaylistTracks(owner.id, id)
    const parsedTracks = handleTracks(items)
    return {
      id,
      owner,
      parsedTracks,
    }
  })

const writePlaylistToFile = async (playlistObj) => {
  console.log(json5.stringify(playlistObj))
  fs.writeFileSync(
    `${fullPath}/playlists/${playlistObj.id}.json`,
    json5.stringify(playlistObj, null, 2),
    (err) => {
      if (err) {
        console.error(err)
      }
    },
  )
}

;(async () => {
  const userAuthToken = await getUserAuth(fullPath)

  await spotify.saveUserAuth(userAuthToken)

  const { body: { items: playlists } } = await spotify.raw.getUserPlaylists()
  // console.log(playlists)

  const parsedPlaylistsPromise = await handlePlaylists(playlists)

  const parsedPlaylists = await Promise.all(parsedPlaylistsPromise)

  // console.log(parsedPlaylists[0])

  parsedPlaylists.forEach((playlist) => { writePlaylistToFile(playlist) })

  // console.log(await getRepoPlaylist(fullPath))

  // const playList = getRepoPlaylist(repoName)
  process.exit()
})()
