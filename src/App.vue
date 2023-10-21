<template>
<div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
<!--   <div class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center" style="display:none;">
    <svg class="animate-spin -ml-1 mr-3 h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div> -->
  <div
    class="container"
    ref="container">
      <add-ticker
        @add-ticker="add" 
        :disabled="tooManyTickersAdded" />
      <template
        v-if="tickers.length > 0">
      <hr class="w-full border-t border-gray-600 my-4" />
      <div>
        <button
          v-if="page > 1"
          @click="page--"
          class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">Назад</button>
        <button
          v-if="hasNextPage"
          @click="page++"
          class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">Вперед</button>
        </div>
        <div>
          Фильтр: <input v-model="filter" />
        </div>
      <hr class="w-full border-t border-gray-600 my-4" />
      <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div
          v-for="t in paginatedTickers"
          :key="t.name"
          @click="select(t)"
          :class="{
            'border-4': selectedTicker === t,
            'bg-white': t.price !== '-'
          }"
          class="bg-slate-300 overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
        >
          <div class="px-4 py-5 sm:p-6 text-center">
            <dt class="text-sm font-medium text-gray-500 truncate">
              {{ t.name }} - USD
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900">
              {{ formatPrice(t.price) }}
            </dd>
          </div>
          <div class="w-full border-t border-gray-200"></div>
          <button
            @click.stop="handleDelete(t)"
            class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="#718096"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path></svg>Удалить
          </button>
        </div>
      </dl>
      <hr class="w-full border-t border-gray-600 my-4" />
    </template>
    <crypto-graph
      @close-graph="(x) => { this.selectedTicker = x; }" />
  </div>
</div>
</template>

<script>
// [x] Наличие в состоянии ЗАВИСИМЫХ ДАННЫХ
// [] Запросы напрямую внутри компонента
// [] При удалении остается подписка на загрузку тикера
// [] Обработка ошибок API
// [] Количество запросов
// [x] При удалении тикера не изменяется localStorage # сделал
// [x] Одинаковый код в watch
// [] localStorage и анонимные вкладки
// [] График ужасно выглядит, если будет много цен
// [] Магические строки и числа

// [x] График сломан, если везде одинаковые значения
// [x] При удалении тикера остается выбор

// DOGE, BTC, XMR, ZEC, ETH, MTH, XVG, LTC, FTC, DASH, ZET
import { computed } from 'vue';
import { subscribeToTicker, unsubscribeFromTicker } from './api';
import AddTicker from './components/AddTicker.vue';
import CryptoGraph from './components/CryptoGraph.vue';

export default {
  name: 'App',


  components: {
    AddTicker,
    CryptoGraph,
  },

  data() {
    return {
      tickers: [],
      tickerExists: false,
      maxTickersAmount: 17,
      selectedTicker: null,
      page: 1,
      filter: '',
      itemsPerPage: 6,
      graph: [],
      maxGraphElements: 1,
      getGraph: undefined,
      graphColumnWidth: 40
    };
  },

  mounted() {
    window.addEventListener('resize', this.calculateMaxGraphElements);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.calculateMaxGraphElements);
  },

  created() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    if (windowData.filter) {
      this.filter = windowData.filter;
    }

    if (windowData.page) {
      this.page = windowData.page;
    }

    const tickersData = localStorage.getItem('cryptonomicon-list');

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach(ticker => {
        subscribeToTicker(ticker.name, newPrice =>
          this.updateTicker(ticker.name, newPrice));
      });
    }

    setInterval(this.updateTicker, 500);
  },

  provide() {
    return {
      normalizedGraph: computed(() => this.normalizedGraph),
      selectedTicker: computed(() => this.selectedTicker),
      tickerExists: computed(() => this.tickerExists),
      tickerExistsFunc: computed(() => this.tickerExistsFunc),
      paginatedTickers: computed(() => this.paginatedTickers),
      page: computed(() => this.page)
    }
  },

  computed: {
    normalizedGraph() {
      const maxValue = Math.max(...this.graph);
      const minValue = Math.min(...this.graph);

      if (minValue === maxValue) {
        return this.graph.map(() => 50);
      }

      return this.graph.map(
        price => 5 + ((price - minValue) * 95) / (maxValue - minValue));
    },


    tooManyTickersAdded() {
      return this.tickers.length > this.maxTickersAmount;
    },

    indexStart() {
      return (this.page - 1) * this.itemsPerPage;
    },

    indexEnd() {
      return this.page * this.itemsPerPage;
    },

    filteredTickers() {
      return this.tickers.filter(ticker => ticker.name.includes(this.filter.toUpperCase()))
    },

    paginatedTickers() {
      return this.filteredTickers.slice(this.indexStart, this.indexEnd);
    },

    hasNextPage() {
      return this.filteredTickers.length > this.indexEnd;
    },

    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page 
      }
    }

  },

  watch: {
    paginatedTickers() {
      if ((this.paginatedTickers.length < 1) &&
          (this.page > 1)) {
        this.page -= 1;
      }
    },

    selectedTicker() {
      this.graph = [];
      this.$nextTick().then(this.calculateMaxGraphElements);
    },

    tickers() {
      localStorage.setItem('cryptonomicon-list', JSON.stringify(this.tickers));
    },

    filteredTickers() {
      if (this.filteredTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },

    filter() {
      this.page = 1;
    },

    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );  
    }
  },

  methods: {
    calculateMaxGraphElements() {
      if (!this.$refs.container) {
        return;
      }

      this.maxGraphElements = this.$refs.container.clientWidth / this.graphColumnWidth;
    },

    updateTicker(tickerName, price) {
      this.tickers
        .filter(t => t.name === tickerName)
        .forEach(t => {
          if (t === this.selectedTicker) {
            this.graph.push(price);
            console.log(this.graph.length, this.maxGraphElements);
            if (this.graph.length > this.maxGraphElements) {
              this.graph = this.graph.slice(1, this.maxGraphElements);
            }
          }
          t.price = price;
        });
    }, 

    formatPrice(price) {
      if (price === '-') {
        return price;
      }
      return price > 1
        ? price.toFixed(2)
        : price.toPrecision(2);
    },

    add(ticker) {
      const currentTicker = {
        name: ticker.toUpperCase(),
        price: '-',
      };

      this.tickerExistsFunc(currentTicker.name);
      if (this.tickerExists || currentTicker.name == '') {
        return;
      }

      this.tickers = [...this.tickers, currentTicker];
      this.filter = '';
      subscribeToTicker(currentTicker.name, newPrice =>
        this.updateTicker(currentTicker.name, newPrice)
      );
    },

    select(ticker) {
      this.selectedTicker = ticker;
    },

    handleDelete(tickerToRemove) {
      this.tickers = this.tickers.filter(t => t !== tickerToRemove);
      const cryptList = JSON.parse(localStorage.getItem('cryptonomicon-list'));
      localStorage.setItem('cryptonomicon-list', JSON.stringify(
        cryptList.filter(i => i.name !== tickerToRemove.name)));

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
  }
};
</script>

<style src="./app.css"></style>
