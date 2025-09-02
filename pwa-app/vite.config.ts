/// <reference types="node" />
import { defineConfig, loadEnv, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import type { ServerOptions } from 'https'   // ← vigtig

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  const useHttps   = env.VITE_DEV_HTTPS === '1'
  const exposeHost = env.VITE_DEV_HOST === '1'

  const httpsOpt: ServerOptions | undefined = useHttps ? {} : undefined


  const config: UserConfig = {
    plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
    server: {
      https: httpsOpt,             // ← ikke boolean
      host: exposeHost ? true : false,
    },
  }

  return config
})
