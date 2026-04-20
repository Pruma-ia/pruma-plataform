import { db } from "../src/lib/db"
import { users } from "../db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

const EMAIL = "mattioli.marcelo@gmail.com"
const PASSWORD = "123Olecr@m"

async function main() {
  const [existing] = await db.select().from(users).where(eq(users.email, EMAIL))

  if (existing) {
    await db
      .update(users)
      .set({ isSuperAdmin: true })
      .where(eq(users.id, existing.id))
    console.log(`✓ Usuário existente atualizado: ${EMAIL} → isSuperAdmin = true`)
    return
  }

  const hashed = await bcrypt.hash(PASSWORD, 12)

  await db.insert(users).values({
    name: "Marcelo Mattioli",
    email: EMAIL,
    password: hashed,
    isSuperAdmin: true,
  })

  console.log(`✓ Superadmin criado: ${EMAIL}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
