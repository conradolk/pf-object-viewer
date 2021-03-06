<template>
  <v-layout justify-center data-app="true">
    <v-flex xs12 sm5 mx-2>
      <v-card>
        <!-- Title -->
        <v-card-title class="headline">
          {{ title }}
        </v-card-title>
        <!---->

        <v-spacer></v-spacer>

        <!-- Search, filter and sorting inputs !-->
        <v-layout justify-center>
          <v-flex xs12 md4 mx-2>
            <v-text-field
                    name="search"
                    label="Search"
                    v-model="filterSearch"
                    clearable
                    autofocus
                    data-test="input-search"
            >
            </v-text-field>
          </v-flex>

          <v-flex xs12 md6 mx-2>
            <v-select
                    name="filterBy"
                    label="Search by"
                    v-model="filterBy"
                    :items="getFiltersOptions"
                    item-text="description"
                    item-value="value"
                    clearable
                    data-test="input-filter-type"
            >
            </v-select>
          </v-flex>
        </v-layout>
        <v-layout justify-center>
          <v-flex xs12 md4 mx-2>
            <v-select
                    name="available"
                    label="Available"
                    v-model="filterAvailable"
                    :items="getAvailabilityFilterOptions"
                    item-text="description"
                    item-value="value"
                    clearable
                    data-test="input-filter-availability"
            >
            </v-select>
          </v-flex>
          <v-flex xs12 md6 mx-2>
            <v-select
                    name="sortBy"
                    label="Sort by"
                    v-model="sorting"
                    :items="getSortingOptions"
                    item-text="description"
                    item-value="value"
                    clearable
                    multiple
                    data-test="input-sorting"
            >
            </v-select>
          </v-flex>
        </v-layout>
        <!---->

        <!-- Table rendering the objects !-->
        <v-data-table
                :headers="headers"
                :items="objects"
                :loading="isLoading"
                disable-initial-sort
                hide-actions
        >
          <v-progress-linear v-slot:progress color="blue" indeterminate></v-progress-linear>

          <template v-slot:items="items">
            <router-link tag="tr"
                         :to="{name: 'object-detail', params: {id: items.item.id}}"
                         title="Go to detail"
                         :key="items.item.id"
                         data-test="item-link"
            >
              <td v-for="(property, index) in items.item"
                  :key="`item-table-cell-${index}-${property}`"
                  data-test="item-cell">
                {{ property }}
              </td>
            </router-link>
          </template>

        </v-data-table>
      </v-card>
      <!---->

      <!-- Pagination -->
      <v-layout align-center justify-center my-2>
        <v-pagination
                v-model="currentPage"
                :length="getTotalPages"
                :disabled="isLoading"
                circle
                data-test="input-pagination"
        ></v-pagination>
      </v-layout>
      <!---->
    </v-flex>
  </v-layout>
</template>

<script>
/***
 * This was my first idea and approach for the functionality. I used Vuetify's components + Vuex.
 * I decided to go for single Vuetify components + Vuex because the model management is much better, the code
 * is better organized and cleaner.
 * It also enables other components (if that was the case) to access the objects, pagination, filters and sorting.
 * In my opinion Vuex (sometimes) should be used in medium to large apps for avoiding to refactor from local state to Vuex later.
 * Vuex is not a silver bullet, and it's not always the right tool, but "Use Vuex before is too late".
 */

/**
 * A paginated table rendering the objects data with the possibility to search, filter and sort.
 * It polls/refreshes data periodically.
 */
import { mapGetters } from 'vuex'
import loaders from '@/consts/loaders'
import Toast from 'vuetify-toast'
import debounce from 'debounce'
import { INPUT_DEBOUNCE_INTERVAL } from '@/consts/inputs'
import { parseRouteQuery } from '@/utils/url'

export default {
  name: 'ObjectList',
  data () {
    return {
      title: 'Objects List',
      pollingInterval: null,
      headers: [
        { text: 'ID', align: 'left', sortable: false, value: 'id' },
        { text: 'Name', sortable: false, value: 'name' },
        { text: 'Description', sortable: false, value: 'description' },
        { text: 'Type', sortable: false, value: 'type' },
        { text: 'Available', sortable: false, value: 'available' }
      ]
    }
  },
  methods: {
    /**
     * Sets the pagination, sorting, and filtering settings.
     * Called from the $route watch.
     * @param {object} settings Parsed settings
     */
    applySettings (settings) {
      this.$store.dispatch('objectsList/applySettings', settings)
    },
    /**
     * Fetches the objects with the associated settings.
     */
    fetchObjects () {
      this.$store.dispatch('objectsList/fetchObjects')
        .catch(() => {
          Toast.error('An error has occured while fetching the objects.')
        })
    },
    /**
     * Starts the interval for polling the objects data every X seconds.
     * @param {number} interval Interval in milliseconds
     */
    startFetchObjectPolling (interval) {
      this.pollingInterval = setInterval(() => {
        this.fetchObjects()
      }, interval)
    },
    /**
     * Pushes the new route with the updated params, triggers route watch and allows the user to go back and forward.
     * @param {string} param Parameter name
     * @param {string} value Parameter value
     */
    updateRoute (param, value) {
      // The new query that will be pushed to the router based on the current route
      let newQuery = Object.assign({}, this.$route.query)

      // Handle single and multiple value inputs (select inputs)
      let parsedValue = Array.isArray(value) ? value.join(',') : value

      // If the value wasn't cleared, add/update it to the new query
      // If the value was cleared and the current route has it set, delete it from the new query
      if (parsedValue) {
        newQuery[param] = parsedValue
      } else if (!parsedValue && newQuery.hasOwnProperty(param)) {
        delete newQuery[param]
      }

      // If a filter/sorting/input is changed, set the page to the first
      if (param !== 'page') {
        newQuery.page = 1
      }

      this.$router.push({
        name: 'objects-list',
        query: newQuery
      })
    },
    /**
     * Debounces the search input to avoid multiple unnecessary requests.
     */
    debounceSearch: debounce(function (value) { // Can't use arrow function notation because of "this" binding
      this.updateRoute('search', value)
    }, INPUT_DEBOUNCE_INTERVAL)
  },
  computed: {
    /**
     * v-model setters/getters for the inputs.
     * Could also use :value and @input on every input instead but in this case I don't want to pollute the view with logic.
     * Every input would need: @input="updateRoute('inputName', $event).
     * Its a trade-off between polluting the view with boilerplate logic vs. having larger setter/getters methods.
     **/
    filterSearch: {
      get () {
        return this.getSearch
      },
      set (value) {
        this.debounceSearch(value)
      }
    },
    filterBy: {
      get () {
        return this.getFilterSelected
      },
      set (value) {
        this.updateRoute('filterBy', value)
      }
    },
    filterAvailable: {
      get () {
        return this.getAvailabilityFilterSelected
      },
      set (value) {
        this.updateRoute('available', value)
      }
    },
    sorting: {
      get () {
        return this.getSortingSelected
      },
      set (value) {
        this.updateRoute('sortBy', value)
      }
    },
    currentPage: {
      get () {
        return this.getCurrentPage
      },
      set (value) {
        this.updateRoute('page', value)
      }
    },
    /** *
     * Indicates if there is a fetching operation at the moment.
     * @returns {boolean}
     */
    isLoading () {
      return this.$wait.is(loaders.objectsList.FETCH_OBJECTS) // vue-wait plugin
    },
    /**
     * Computes the objects structure for showing in the table.
     * @returns {object}
     */
    objects () {
      if (!this.getObjects) {
        return []
      }

      return this.getObjects.map(object => {
        return {
          id: object.id,
          name: object.name,
          description: object.description,
          type: object.type,
          available: object.available ? 'Yes' : 'No'
        }
      })
    },
    ...mapGetters('objectsList', [
      'getObjects',
      'getTotalPages',
      'getCurrentPage',
      'getSearch',
      'getFiltersOptions',
      'getFilterSelected',
      'getSortingOptions',
      'getSortingSelected',
      'getAvailabilityFilterOptions',
      'getAvailabilityFilterSelected',
      'getPollingInterval'
    ])
  },
  /**
   * Start the data/objects polling when the component is created.
   */
  created () {
    this.startFetchObjectPolling(this.getPollingInterval)
  },
  /**
   * When a new route is detected, the settings will be hydrated from the URL and the objects will be fetched.
   * The URL is taken as the single source of truth in this case.
   * beforeRouteUpdate hook could also be used, but there is no need to prevent navigation.
   */
  watch: {
    '$route': {
      immediate: true,
      handler () {
        this.applySettings(parseRouteQuery(this.$route.query))
        this.fetchObjects()
      }
    }
  },
  /**
   * When the component is about the be destroyed, clear the interval, avoiding memory leaks and reset the store.
   */
  beforeDestroy () {
    clearInterval(this.pollingInterval)
    this.$store.dispatch('objectsList/resetStore') // TODO: use mapActions for consistency
  }
}
</script>

<style lang="scss" scoped>

</style>
