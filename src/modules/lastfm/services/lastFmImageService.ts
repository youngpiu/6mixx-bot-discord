import sharp from 'sharp'

export class LastFmImageService {
  /**
   * Helper to fetch image with retries and timeout
   */
  private static async fetchImage(url: string, retries = 2): Promise<Buffer> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': '6mixx-bot/1.1.0' }
        })
        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return Buffer.from(await res.arrayBuffer())
      } catch (error) {
        if (attempt === retries) throw error
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    throw new Error('Failed to fetch image')
  }

  /**
   * Renders a collage chart using sharp.
   */
  public static async renderChart(
    items: { url: string; title: string; subtitle?: string; stats?: string }[],
    width: number,
    height: number
  ) {
    const tileSize = 300
    const canvasWidth = width * tileSize
    const canvasHeight = height * tileSize

    const compositeLayers = await Promise.all(
      items.slice(0, width * height).map(async (item, i) => {
        const x = (i % width) * tileSize
        const y = Math.floor(i / width) * tileSize

        let imageBuffer: Buffer
        try {
          const isPlaceholder =
            !item.url ||
            item.url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
            item.url.trim() === ''

          if (isPlaceholder) throw new Error('No image URL')
          imageBuffer = await this.fetchImage(item.url)
        } catch {
          // Robust placeholder generation
          imageBuffer = await sharp({
            create: {
              width: tileSize,
              height: tileSize,
              channels: 3,
              background: { r: 35, g: 35, b: 35 }
            }
          })
            .png()
            .toBuffer()
        }

        const tile = sharp(imageBuffer).resize(tileSize, tileSize, {
          fit: 'cover',
          position: 'center'
        })

        const escape = (str: string) =>
          str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')

        const truncate = (str: string, len: number) =>
          str.length > len ? str.substring(0, len - 3) + '...' : str

        const title = escape(truncate(item.title, 35))
        const subtitle = item.subtitle
          ? escape(truncate(item.subtitle, 40))
          : ''
        const stats = item.stats ? escape(item.stats) : ''

        const svgOverlay = `
          <svg width="${tileSize}" height="${tileSize}">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="50%" style="stop-color:black;stop-opacity:0" />
                <stop offset="100%" style="stop-color:black;stop-opacity:0.9" />
              </linearGradient>
            </defs>
            <rect x="0" y="${tileSize * 0.5}" width="${tileSize}" height="${tileSize * 0.5}" fill="url(#grad)" />
            <text x="10" y="${tileSize - 35}" font-family="sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="start">${title}</text>
            <text x="10" y="${tileSize - 15}" font-family="sans-serif" font-size="14" fill="#ddd" text-anchor="start">${subtitle}</text>
            <text x="${tileSize - 10}" y="${tileSize - 15}" font-family="sans-serif" font-size="14" fill="white" text-anchor="end">${stats}</text>
          </svg>
        `
        const finalTileBuffer = await tile
          .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
          .toBuffer()
        return {
          input: finalTileBuffer,
          left: x,
          top: y
        }
      })
    )

    return sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: { r: 17, g: 18, b: 20 }
      }
    })
      .composite(compositeLayers)
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
  }
}
