<script setup lang="ts">
import { ref } from 'vue';

const name = ref('');
const address = ref('');
const city = ref('');
const country = ref('');
const paymentMethod = ref('credit-card');
const agreeTerms = ref(false);

const emit = defineEmits<{
  submit: [data: {
    name: string;
    address: string;
    city: string;
    country: string;
    paymentMethod: string;
  }];
  cancel: [];
}>();

function handleSubmit() {
  emit('submit', {
    name: name.value,
    address: address.value,
    city: city.value,
    country: country.value,
    paymentMethod: paymentMethod.value,
  });
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <form @submit.prevent="handleSubmit" aria-label="Checkout form">
    <input
      v-model="name"
      type="text"
      placeholder="Full name"
      aria-label="Full name"
      required
    />
    <input
      v-model="address"
      type="text"
      placeholder="Street address"
      aria-label="Street address"
      required
    />
    <input
      v-model="city"
      type="text"
      placeholder="City"
      aria-label="City"
      required
    />

    <select v-model="country" aria-label="Country" required>
      <option value="">Select country</option>
      <option value="us">United States</option>
      <option value="uk">United Kingdom</option>
      <option value="de">Germany</option>
      <option value="fr">France</option>
    </select>

    <select v-model="paymentMethod" aria-label="Payment method">
      <option value="credit-card">Credit Card</option>
      <option value="paypal">PayPal</option>
      <option value="bank-transfer">Bank Transfer</option>
    </select>

    <label>
      <input
        v-model="agreeTerms"
        type="checkbox"
        aria-label="Agree to terms and conditions"
        required
      />
      I agree to the terms and conditions
    </label>

    <button type="submit" :disabled="!agreeTerms">Place order</button>
    <button type="button" @click="handleCancel">Cancel order</button>
  </form>
</template>
