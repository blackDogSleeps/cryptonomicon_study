<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <!--   <div class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center" style="display:none;">
    <svg class="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div> -->
    <div class="container" ref="container">
      <add-ticker
        @add-ticker="add" 
        :disabled="tooManyTickersAdded" 
      />
      <filter-and-navigation
        v-if="tickers.length > 0"
        @selectTicker="(t) => { select(t); }"
      />
      <crypto-graph
        @close-graph="(x) => { selectedTicker = x; }"
      />
    </div>
  </div>
</template>

<script>
// DOGE, BTC, XMR, ZEC, ETH, MTH, XVG, LTC, FTC, DASH, ZET
import { computed } from "vue";
import { subscribeToTicker, unsubscribeFromTicker } from "./api";
import AddTicker from "./components/AddTicker.vue";
import CryptoGraph from "./components/CryptoGraph.vue";
import FilterAndNavigation from  './components/FilterAndNavigation.vue';

export default {
  name: "App",

  components: {
    AddTicker,
    CryptoGraph,
    FilterAndNavigation
  },

  data() {
    return {
      tickers: [],
      tickerExists: false,
      maxTickersAmount: 17,
      selectedTicker: null,
      graph: [],
      maxGraphElements: 1,
      getGraph: undefined,
      graphColumnWidth: 40,
    };
  },

  mounted() {
    window.addEventListener("resize", this.calculateMaxGraphElements);
  },

  beforeUnmount() {
    window.removeEventListener("resize", this.calculateMaxGraphElements);
  },

  created() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries(),
    );

    if (windowData.filter) {
      this.filter = windowData.filter;
    }

    if (windowData.page) {
      this.page = windowData.page;
    }

    const tickersData = localStorage.getItem("cryptonomicon-list");

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach((ticker) => {
        subscribeToTicker(ticker.name, (newPrice) =>
          this.updateTicker(ticker.name, newPrice),
        );
      });
    }

    setInterval(this.updateTicker, 500);
  },

  provide() {
    return {
      normalizedGraph: computed(() => this.normalizedGraph),
      selectedTicker: computed(() => this.selectedTicker),
      tickers: computed(() => this.tickers),
      tickerExists: computed(() => this.tickerExists),
      tickerExistsFunc: computed(() => this.tickerExistsFunc),
      handleDelete: computed(() => this.handleDelete),
    };
  },

  computed: {
    normalizedGraph() {
      const maxValue = Math.max(...this.graph);
      const minValue = Math.min(...this.graph);

      if (minValue === maxValue) {
        return this.graph.map(() => 50);
      }

      return this.graph.map(
        (price) => 5 + ((price - minValue) * 95) / (maxValue - minValue),
      );
    },

    tooManyTickersAdded() {
      return this.tickers.length > this.maxTickersAmount;
    },
  },

  watch: {
    selectedTicker() {
      this.graph = [];
      this.$nextTick().then(this.calculateMaxGraphElements);
    },

    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },
  },

  methods: {
    calculateMaxGraphElements() {
      if (!this.$refs.container) {
        return;
      }

      this.maxGraphElements =
        this.$refs.container.clientWidth / this.graphColumnWidth;
    },

    updateTicker(tickerName, price) {
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          if (t === this.selectedTicker) {
            this.graph.push(price);
            if (this.graph.length > this.maxGraphElements) {
              this.graph = this.graph.slice(1, this.maxGraphElements);
            }
          }
          t.price = price;
        });
    },

    add(ticker) {
      const currentTicker = {
        name: ticker.toUpperCase(),
        price: "-",
      };

      this.tickerExistsFunc(currentTicker.name);
      if (this.tickerExists || currentTicker.name == "") {
        return;
      }

      this.tickers = [...this.tickers, currentTicker];
      this.filter = "";
      subscribeToTicker(currentTicker.name, (newPrice) =>
        this.updateTicker(currentTicker.name, newPrice),
      );
    },

    select(ticker) {
      this.selectedTicker = ticker;
    },

    handleDelete(tickerToRemove) {
      this.tickers = this.tickers.filter((t) => t !== tickerToRemove);
      const cryptList = JSON.parse(localStorage.getItem("cryptonomicon-list"));
      localStorage.setItem(
        "cryptonomicon-list",
        JSON.stringify(cryptList.filter((i) => i.name !== tickerToRemove.name)),
      );

      if (this.selectedTicker === tickerToRemove) {
        this.selectedTicker = null;
      }
      unsubscribeFromTicker(tickerToRemove.name);
    },

    tickerExistsFunc(currentTickerName) {
      for (let i of this.tickers) {
        if (i.name === currentTickerName.toUpperCase()) {
          this.tickerExists = true;
          return;
        }
      }
      this.tickerExists = false;
    },
  },
};
</script>

<style src="./app.css"></style>
