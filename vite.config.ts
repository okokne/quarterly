import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    define: {
      __VITE_SYNC_ENABLED__: JSON.stringify(env.VITE_SYNC_ENABLED ?? ""),
      __VITE_SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL ?? ""),
      __VITE_SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ""),
      __VITE_AUTH_REDIRECT_URL__: JSON.stringify(env.VITE_AUTH_REDIRECT_URL ?? "")
    },
    server: { hmr: true } // Force HMR
  };
});
