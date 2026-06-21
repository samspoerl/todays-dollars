import { copyFileSync, existsSync } from 'fs'

const src = '.env.docker'
const dest = '.env'

if (existsSync(dest)) {
  console.log(`${dest} already exists, skipping copy`)
} else {
  copyFileSync(src, dest)
  console.log(`Copied ${src} → ${dest}`)
}
