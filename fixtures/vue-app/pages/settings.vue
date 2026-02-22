<template>
  <div>
    <form @submit.prevent="saveSettings">
      <input placeholder="Display Name" />
      <select @change="changeTheme">
        <option>Light</option>
        <option>Dark</option>
      </select>
      <button>Save</button>
    </form>
    <button @click="deleteAccount" aria-label="Delete account">Delete Account</button>
  </div>
</template>

<script setup lang="ts">
function saveSettings() {}
function changeTheme() {}
function deleteAccount() {}
</script>
