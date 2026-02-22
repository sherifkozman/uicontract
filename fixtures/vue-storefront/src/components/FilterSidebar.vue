<script setup lang="ts">
import { ref } from 'vue';

interface Category {
  id: string;
  name: string;
}

const categories = ref<Category[]>([
  { id: 'electronics', name: 'Electronics' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'books', name: 'Books' },
]);

const selectedCategories = ref<string[]>([]);
const priceRange = ref(100);
const sortBy = ref('relevance');

const emit = defineEmits<{
  apply: [filters: { categories: string[]; maxPrice: number; sortBy: string }];
  reset: [];
}>();

function handleApply() {
  emit('apply', {
    categories: selectedCategories.value,
    maxPrice: priceRange.value,
    sortBy: sortBy.value,
  });
}

function handleReset() {
  selectedCategories.value = [];
  priceRange.value = 100;
  sortBy.value = 'relevance';
  emit('reset');
}
</script>

<template>
  <form @submit.prevent="handleApply" aria-label="Product filters">
    <fieldset>
      <legend>Categories</legend>
      <label v-for="cat in categories" :key="cat.id">
        <input
          type="checkbox"
          :value="cat.id"
          v-model="selectedCategories"
          :aria-label="`Filter by ${cat.name}`"
        />
        {{ cat.name }}
      </label>
    </fieldset>

    <label>
      Max price
      <input
        type="range"
        min="0"
        max="1000"
        v-model.number="priceRange"
        aria-label="Maximum price"
      />
    </label>

    <select v-model="sortBy" aria-label="Sort products">
      <option value="relevance">Relevance</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="newest">Newest</option>
    </select>

    <button type="submit">Apply filters</button>
    <button type="button" @click="handleReset">Reset filters</button>
  </form>
</template>
