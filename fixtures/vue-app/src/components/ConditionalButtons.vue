<template>
  <div>
    <button v-if="isAdmin" @click="openAdmin">Admin Panel</button>
    <button v-else @click="requestAccess">Request Access</button>
    <div v-show="showDetails">
      <button @click="editDetails">Edit</button>
    </div>
    <form @submit.prevent="save">
      <input placeholder="Name" />
      <textarea placeholder="Bio"></textarea>
      <button>Save Changes</button>
    </form>
  </div>
</template>

<script setup lang="ts">
const isAdmin = false;
const showDetails = true;
function openAdmin() {}
function requestAccess() {}
function editDetails() {}
function save() {}
</script>
