<script setup lang="ts">
import { ref } from 'vue';

const searchQuery = ref('');
</script>

<template>
  <div>
    <h1>Products</h1>
    <input
      v-model="searchQuery"
      type="search"
      placeholder="Search products..."
      aria-label="Search products"
    />
    <a href="/cart" aria-label="View cart">View cart</a>
  </div>
</template>
