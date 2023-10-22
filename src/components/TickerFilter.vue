<template>
  <div>Фильтр: <input v-model="filter" /></div>
</template>

<script>
export default {
  
  data() {
    return {
      filter: ""
    }
  },

  emits: [
    'addFilter',
  ],

  watch: {
    filter() {
      this.$emit('addFilter', this.filter);
    }
  }
};
</script>