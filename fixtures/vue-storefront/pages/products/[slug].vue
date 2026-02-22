<script setup lang="ts">
import { ref } from 'vue';

const selectedSize = ref('');
const isWishlisted = ref(false);
const isLoggedIn = ref(true);

const emit = defineEmits<{
  addToCart: [size: string];
  toggleWishlist: [];
}>();

function handleAddToCart() {
  emit('addToCart', selectedSize.value);
}

function handleToggleWishlist() {
  isWishlisted.value = !isWishlisted.value;
  emit('toggleWishlist');
}
</script>

<template>
  <div>
    <select v-model="selectedSize" aria-label="Select size">
      <option value="">Choose size</option>
      <option value="s">Small</option>
      <option value="m">Medium</option>
      <option value="l">Large</option>
      <option value="xl">Extra Large</option>
    </select>

    <button @click="handleAddToCart" aria-label="Add to cart">
      Add to cart
    </button>

    <button
      v-if="isLoggedIn"
      @click="handleToggleWishlist"
      :aria-label="isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'"
    >
      {{ isWishlisted ? 'Remove from wishlist' : 'Add to wishlist' }}
    </button>

    <a href="/products" aria-label="Back to products">Back to products</a>
  </div>
</template>
