import types from './object-detail.mutations'
import commonTypes from '@/store/common/common.mutation'
import APIService from '@/api/api-service'
import loaders from '@/consts/loaders'

// Keep the initial state in case we need to reset the store, when a component is destroyed for example.
const initialState = () => ({
  object: null
})

const state = initialState()

const getters = {
  /**
   * Gets the object detail
   * @param state
   * @returns {object}
   */
  getObject: state => {
    return state.object
  }
}

const mutations = {
  /**
   * Resets the store's state
   * @param state
   */
  [commonTypes.RESET_STORE] (state) {
    const init = initialState()
    Object.keys(init).forEach(key => {
      state[key] = init[key]
    })
  },
  /**
   * Sets the object detail
   * @param state
   * @param object
   */
  [types.SET_OBJECT] (state, object) {
    state.object = object
  }
}

const actions = {
  /**
   * Fetches the object detail
   * @param commit
   * @param dispatch
   * @param {number} objectId
   */
  fetchObject ({ commit, dispatch }, objectId) {
    const loaderName = loaders.objectDetail.FETCH_OBJECT_DETAIL

    dispatch('wait/start', loaderName, { root: true })
    return new Promise((resolve, reject) => {
      const URL = `/objects/${objectId}`

      APIService.get(URL)
        .then((res) => {
          commit(types.SET_OBJECT, res.data)
          resolve()
        })
        .catch((err) => {
          console.error('An error has occured while fetching the object detail', err)
          reject(err)
        })
        .finally(() => dispatch('wait/end', loaderName, { root: true }))
    })
  },
  /**
   * Resets the store's state.
   * @param commit
   *
   */
  resetStore ({ commit }) {
    commit(commonTypes.RESET_STORE)
  }
}

export default {
  namespaced: true,
  initialState,
  state,
  getters,
  mutations,
  actions
}
