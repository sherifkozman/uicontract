<template>
  <div>
    <button @click="refreshList" aria-label="Refresh users">Refresh</button>
    <div v-for="user in users" :key="user.id">
      <button @click="selectUser(user)">{{ user.name }}</button>
      <a :href="`/users/${user.id}`">View Profile</a>
    </div>
    <select @change="handleSort">
      <option>Name</option>
      <option>Date</option>
    </select>
  </div>
</template>

<script setup lang="ts">
const users = [{ id: 1, name: 'Alice' }];
function refreshList() {}
function selectUser(_user: unknown) {}
function handleSort() {}
</script>
