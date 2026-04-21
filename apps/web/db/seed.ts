import "dotenv/config"
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { users } from "./schema"
import { eq } from "drizzle-orm"

const email = process.env.SUPER_ADMIN_EMAIL
const password = process.env.SUPER_ADMIN_PASSWORD
const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin"

if (!email || !password) {
  console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required")
  process.exit(1)
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql)

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email))

  if (existing.length > 0) {
    console.log(`Super admin already exists: ${email}`)
    process.exit(0)
  }

  const hashed = await bcrypt.hash(password, 12)

  await db.insert(users).values({
    email,
    name,
    password: hashed,
    isSuperAdmin: true,
    emailVerified: new Date(),
  })

  console.log(`Super admin created: ${email}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
