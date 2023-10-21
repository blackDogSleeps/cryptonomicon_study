<template>
  <section>
      <div class="flex">
        <div class="max-w-xs">
          <label for="wallet" class="block text-sm font-medium text-gray-700">
          Тикер {{ ticker }}</label>
          <div class="mt-1 relative rounded-md shadow-md">
            <input
              @keydown.enter="add"
              @keyup="getTicker"
              v-model="ticker"
              type="text"
              name="wallet"
              id="wallet"
              class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
              placeholder="Например DOGE"
              :disabled="disabled"
              :class ="{
                'opacity-50': disabled
              }"
            />
          </div>
          <div
            v-if="tickersShow.length > 0"
            class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap">
            <span
              @click="fillInput(item)"
              v-for="item in tickersShow"
              :key="item"
              class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer">{{ item }}
            </span>
          </div>
          <div 
            v-if="tickerExists"
            class="text-sm text-red-600">Такой тикер уже добавлен</div>
        </div>
      </div>
      <add-button
        @click="add"
        class="my-4"
        :disabled="disabled" />
    </section>
</template>

<script>
import AddButton from './AddButton.vue';

export default {
  components: {
    AddButton
  },

  props: {
    disabled: {
      type: Boolean,
      required: false,
      default: false
    }
  },

  inject: [
    'tickerExists',
    'tickerExistsFunc'],

  data() {
    return {
      ticker: '',
      tickersShow: [],
      tickersList: {},
    };
  },

  mounted() {
    (async () => {
      let response = await fetch(
        'https://min-api.cryptocompare.com/data/all/coinlist?summary=true');
      let res = await response.json();
      this.tickersList = res.Data;
    })();
  },

  methods: {
    add() {
      this.$emit('add-ticker', this.ticker);
      this.ticker = '';
    },

    getTicker() {
      let key = this.ticker.toUpperCase();

      if (key != '') {
        this.tickersShow = Object.keys(
          this.tickersList).filter(item => item.includes(key));
      } else {
        this.tickersShow = {};
      }
    },

    fillInput(item) {
      this.ticker = item;
      this.tickersShow = {};
      this.tickerExistsFunc(item);
    },
  }
}
</script>