import { each, pick, omit } from 'lodash'
import { LAYER_DEFAULTS } from './layers'

const DatabaseModule = {
  state: {
    workingDirectory: {
      id: null,
      name: null
    },
    databaseFile: {
      id: null,
      name: null
    },
  },

  getters: {
    workingDirectory: (state, getters) => { return { ...state.workingDirectory, url: getters.workingDirectoryUrl } },
    workingDirectoryId: state => state.workingDirectory.id,
    workingDirectoryName: state => state.workingDirectory.name,
    workingDirectoryUrl: (state, getters) => getters.driveUrl(state.workingDirectory.id),
    databaseFile: (state, getters) => { return { ...state.databaseFile, url: getters.databaseFileUrl } },
    databaseFileId: state => state.databaseFile.id,
    databaseFileName: state => state.databaseFile.name,
    databaseFileUrl: (state, getters) => getters.driveUrl(state.databaseFile.id),
    driveUrl: () => driveId => `https://drive.google.com/file/d/${driveId}/edit?usp=sharing`,

    databaseState: (_, __, rootState) => {
      return omit(rootState, ["user", "database", "ui", "google"])
    },

    nonPersistedState: (_, __, rootState) => {
      return pick(rootState, ["user", "database", "ui", "google"])
    }
  },

  mutations: {
    setWorkingDirectory(state, { id, name }) {
      state.workingDirectory.id = id
      state.workingDirectory.name = name
    },

    setDatabaseFile(state, { id, name }) {
      state.databaseFile.id = id
      state.databaseFile.name = name
    },
  },

  actions: {
    saveToDrive({ dispatch, getters }) {
      return dispatch("googleUpdateFile", {
        fileId: getters.databaseFileId,
        contents: getters.databaseState
      })
    },

    loadFromDrive({ getters, dispatch, commit  }) {
      return dispatch("googleDownloadFile", getters.databaseFileId)
        .then((databaseContent) => {
          if(!databaseContent) {
            throw new Error(`Failed to load database: ${getters.databaseFileId}`)
          }

          let loadedState = JSON.parse(databaseContent)

          if(!loadedState) {
            throw new Error(`Downloaded database didn't JSON parse: ${databaseContent}`)
          } else {
            // Migrate the database up to current
            return dispatch("migrate", loadedState)
              .then((migratedState) => {
                // Load the database up!
                commit("resetState", migratedState)
              })
          }
        })
    },

    migrate({ getters }, dbState) {
      // combine the loaded data with the local stuff that doesn't get persisted
      const { user, database, google } = getters.nonPersistedState
      dbState.user = user
      dbState.database = database
      dbState.google = google

      // Add missing data to layers
      each(dbState.layers.layers, (layer) => {
        each(LAYER_DEFAULTS[layer.type], (value, key) => {
          // Default each property as needed
          layer[key] = layer[key] || value
        })
      })

      return dbState
    }
  }
}

export default DatabaseModule