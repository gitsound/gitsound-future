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

// const createRepo = async (repoName) => {
//   const repoPath = path.resolve(`./git-repos/${repoName}`)
//   const isBare = 0

//   return await git.Repository.init(repoPath, isBare)
// }

// const openRepo = async (repoName) => {
//   const repoPath = path.resolve(`./git-repos/${repoName}`)

//   return await git.Repository.open(pathToRepo)
// }

// (async () => {

// const newRepo = await createRepo('test2')

// console.log(newRepo)

// const repo = await openRepo('test2')

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

    fs.writeFile(`${playlistPath}/user.json`, json5.stringify(state), (err) => {
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
  const { authToken } = await localUser.getInfo(playlistPath)

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


;(async () => {
  const userAuthToken = await getUserAuth(fullPath)

  await spotify.saveUserAuth(userAuthToken)

  console.log(await spotify.getUser())


  console.log(await getRepoPlaylist(fullPath))

  // const playList = getRepoPlaylist(repoName)
  process.exit()
})()
