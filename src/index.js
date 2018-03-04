import readFile from 'fs-readfile-promise'
import path from 'path'
import nodegit from 'nodegit'
import json5 from 'json5'
import fs from 'fs'
import { getUserAuthTokenFromWeb } from './websever'
import spotify from './spotify'


const filePrefix = './git-repos'
const repoName = 'test2'
const fullPath = `${filePrefix}/${repoName}`

const getPlaylistFileName = playlistObj =>
  `${fullPath}/playlists/${playlistObj.id}.json`

const createRepo = async () => {
  const isBare = 0

  return nodegit.Repository.init(fullPath, isBare)
}

const openRepo = async () => nodegit.Repository.open(`${fullPath}/.git`)

const createAuthor = () => {
  const currentTime = Math.floor(Date.now() / 1000)
  return nodegit.Signature.create(
    'gitsound',
    'none',
    currentTime,
    0,
  )
}

const createCommiter = () => createAuthor()

const commitFile = async (playlistObj) => {
  const filename = `playlists/${playlistObj.id}.json`

  const repo = await openRepo()
  const index = await repo.refreshIndex()
  await index.addByPath(filename)
  await index.write()
  const oid = await index.writeTree()

  const author = createAuthor()
  const committer = createCommiter()

  const { parentArr, message } = await (async () => {
    // TODO: check if first commit has been made
    const isFirstCommit = false
    if (isFirstCommit === true) {
      console.log('making first commit')
      return {
        parentArr: [],
        message: `{"action": "init", "playlist": "${playlistObj.id}"}`,
      }
    }
    const head = await nodegit.Reference.nameToId(repo, 'HEAD')
    const parent = await repo.getCommit(head)
    return {
      parentArr: [parent],
      message: `{"action": "change", "playlist": "${playlistObj.id}"}`,
    }
  })()

  try {
    await repo.createCommit('HEAD', author, committer, message, oid, parentArr)
    console.log(`commited playlist: '${playlistObj.id}'`)
  } catch (err) {
    console.error(err)
  }
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

    fs.writeFileSync(
      `${playlistPath}/user.json`,
      json5.stringify(state, null, 2),
      (err) => {
        if (err) {
          console.error(err)
        }
      },
    )
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

const writePlaylistToFile = (playlistObj) => {
  fs.writeFileSync(
    getPlaylistFileName(playlistObj),
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

  // await Promise.all(parsedPlaylists.map(async (playlist) => {
  //   writePlaylistToFile(playlist)
  //   await commitFile(playlist)
  // }))

  // we need to make sure that items go one at a time because the index locks
  // eslint-disable-next-line no-restricted-syntax
  for (const playlist of parsedPlaylists) {
    writePlaylistToFile(playlist)
    await commitFile(playlist) // eslint-disable-line no-await-in-loop
  }

  // console.log(await getRepoPlaylist(fullPath))

  // const playlist = getRepoPlaylist(repoName)
  process.exit()
})()
