import { defineConfig } from "vite";

// base relativa: funciona em https://usuario.github.io/compartilhar-tela/ sem configurar o nome do repositório
export default defineConfig({
  base: "./",
  build: { target: "es2020" },
});
