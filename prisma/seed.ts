import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

import { PrismaClient } from '../generated/prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function seedEnglish() {
  const filePath = path.join(process.cwd(), 'data', 'english_words.txt')

  const words = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)

  const data = words.map((word) => ({
    word,
    firstLetter: word[0],
    lastLetter: word[word.length - 1]
  }))

  await prisma.englishWord.createMany({
    data,
    skipDuplicates: true
  })

  console.log(`English words inserted: ${data.length}`)
}

async function seedVietnamese() {
  const filePath = path.join(process.cwd(), 'data', 'vietnamese_words.txt')

  const phrases = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)

  const data = phrases.map((phrase) => {
    const parts = phrase.split(/\s+/)

    return {
      phrase,
      firstWord: parts[0],
      lastWord: parts[parts.length - 1]
    }
  })

  await prisma.vietnamesePhrase.createMany({
    data,
    skipDuplicates: true
  })

  console.log(`Vietnamese phrases inserted: ${data.length}`)
}

async function main() {
  console.log('Start seeding...')

  await seedEnglish()
  await seedVietnamese()

  console.log('Seed completed.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
