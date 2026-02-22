<template>
  <form @submit.prevent="handleLogin">
    <input placeholder="Email" @input="validateEmail" />
    <input type="password" placeholder="Password" />
    <button>Log In</button>
    <a href="/forgot-password">Forgot password?</a>
  </form>
</template>

<script setup lang="ts">
function handleLogin() {}
function validateEmail() {}
</script>
