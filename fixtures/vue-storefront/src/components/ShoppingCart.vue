<script lang="ts">
import { defineComponent, type PropType } from 'vue';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default defineComponent({
  name: 'ShoppingCart',
  props: {
    items: {
      type: Array as PropType<CartItem[]>,
      required: true,
    },
  },
  emits: ['update-quantity', 'remove-item', 'clear-cart'],
  methods: {
    decreaseQuantity(item: CartItem) {
      if (item.quantity > 1) {
        this.$emit('update-quantity', item.id, item.quantity - 1);
      }
    },
    increaseQuantity(item: CartItem) {
      this.$emit('update-quantity', item.id, item.quantity + 1);
    },
    handleQuantityInput(item: CartItem, event: Event) {
      const target = event.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      if (!isNaN(value) && value > 0) {
        this.$emit('update-quantity', item.id, value);
      }
    },
    removeItem(id: string) {
      this.$emit('remove-item', id);
    },
    clearCart() {
      this.$emit('clear-cart');
    },
  },
});
</script>

<template>
  <div class="shopping-cart">
    <div v-for="item in items" :key="item.id" class="cart-item">
      <span>{{ item.name }}</span>
      <button @click="decreaseQuantity(item)" :aria-label="`Decrease ${item.name} quantity`">
        -
      </button>
      <input
        type="number"
        :value="item.quantity"
        @input="handleQuantityInput(item, $event)"
        :aria-label="`${item.name} quantity`"
        min="1"
      />
      <button @click="increaseQuantity(item)" :aria-label="`Increase ${item.name} quantity`">
        +
      </button>
      <button @click="removeItem(item.id)" :aria-label="`Remove ${item.name}`">
        Remove
      </button>
    </div>

    <button @click="clearCart" aria-label="Clear cart">Clear cart</button>
    <a href="/checkout" aria-label="Proceed to checkout">Checkout</a>
  </div>
</template>
