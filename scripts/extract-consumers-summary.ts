import { createReadStream, createWriteStream } from 'fs'
import { resolve } from 'path'

interface Consumer {
    name?: string
    phone?: string
    number_of_orders?: number
    campaign_optout?: boolean | null
    created_at?: {
        iso?: string
        [key: string]: any
    }
    [key: string]: any
}

async function extractConsumersSummary() {
    const consumersPath = resolve(__dirname, '../data/store_consumers.json')
    const outputPath = resolve(__dirname, '../data/store_consumers_summary.json')

    console.log('📖 Reading consumers from:', consumersPath)
    console.log('📝 Writing summary to:', outputPath)
    console.log('')

    let processedConsumers = 0
    let isFirst = true
    let buffer = ''
    let insideArray = false

    const writeStream = createWriteStream(outputPath)
    writeStream.write('[\n')

    const readStream = createReadStream(consumersPath, {
        encoding: 'utf8',
        highWaterMark: 256 * 1024
    })

    readStream.on('data', (chunk) => {
        buffer += chunk.toString()

        let braceCount = 0
        let start = -1

        for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i]

            if (char === '[' && !insideArray) {
                insideArray = true
                continue
            }

            if (char === '{' && insideArray) {
                if (braceCount === 0) {
                    start = i
                }
                braceCount++
            } else if (char === '}' && insideArray) {
                braceCount--

                if (braceCount === 0 && start !== -1) {
                    const objectStr = buffer.substring(start, i + 1)

                    try {
                        const consumer: Consumer = JSON.parse(objectStr)

                        const summary = {
                            name: consumer.name ?? null,
                            phone: consumer.phone ?? null,
                            number_of_orders: consumer.number_of_orders ?? null,
                            campaign_optout: consumer.campaign_optout ?? null,
                            created_at: {
                                iso: consumer.created_at?.iso ?? null,
                            },
                        }

                        if (!isFirst) {
                            writeStream.write(',\n')
                        }
                        writeStream.write('  ' + JSON.stringify(summary))
                        isFirst = false
                        processedConsumers++

                        if (processedConsumers % 10000 === 0) {
                            console.log(`✅ Processed ${processedConsumers.toLocaleString()} consumers...`)
                        }
                    } catch (err) {
                        // Skip malformed objects
                    }

                    start = -1
                }
            }
        }

        if (start !== -1 && braceCount > 0) {
            buffer = buffer.substring(start)
        } else {
            buffer = ''
        }
    })

    readStream.on('end', () => {
        writeStream.write('\n]')
        writeStream.end()
        console.log('')
        console.log(`🎉 Complete! ${processedConsumers.toLocaleString()} consumers processed`)
        console.log(`📁 Output file: data/store_consumers_summary.json`)
    })

    readStream.on('error', (err: Error) => {
        console.error('❌ Error:', err)
        process.exit(1)
    })
}

extractConsumersSummary().catch(console.error)

