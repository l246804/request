<script setup lang="ts">
import ShareDemo from './ShareDemo.vue'
</script>

<template>
  <ElContainer style="height: 100vh; overflow: hidden">
    <ElMain>
      <ShareDemo title="请求A" />
      <ShareDemo title="请求B" />
    </ElMain>
  </ElContainer>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
