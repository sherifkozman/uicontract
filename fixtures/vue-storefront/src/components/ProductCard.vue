<script setup lang="ts">
interface Props {
  product: {
    slug: string;
    name: string;
    price: number;
    inStock: boolean;
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  addToCart: [slug: string];
  quickBuy: [slug: string];
}>();
</script>

<template>
  <div class="product-card">
    <a :href="`/products/${props.product.slug}`" :aria-label="`View ${props.product.name}`">
      {{ props.product.name }}
    </a>
    <p>{{ props.product.price }}</p>
    <button @click="emit('addToCart', props.product.slug)" aria-label="Add to cart">
      Add to cart
    </button>
    <button
      v-if="props.product.inStock"
      @click="emit('quickBuy', props.product.slug)"
      aria-label="Quick buy"
    >
      Quick buy
    </button>
  </div>
</template>
