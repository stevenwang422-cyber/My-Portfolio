import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  // glsl() lets you import .glsl/.vert/.frag files as strings,
  // with #include support for sharing shader chunks
  plugins: [react(), glsl()],
})
