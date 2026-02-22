<template>
  <div>
    <div v-for="row in rows" :key="row.id">
      <button @click="editRow(row)" data-testid="edit-btn">Edit</button>
      <button v-if="row.deletable" @click="deleteRow(row)">Delete</button>
    </div>
    <button @click="addRow" aria-label="Add new row">Add Row</button>
  </div>
</template>

<script setup lang="ts">
const rows = [{ id: 1, deletable: true }];
function editRow(_row: unknown) {}
function deleteRow(_row: unknown) {}
function addRow() {}
</script>
