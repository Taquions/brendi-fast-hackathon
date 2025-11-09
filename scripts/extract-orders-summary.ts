import { createReadStream, createWriteStream } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

interface Order {
    id: string
    totalPrice: number
    status?: string
    payment?: {
        type?: string
        online?: any
        total?: number
        [key: string]: any
    }
    delivery?: {
        type?: string
        maxTime?: any
        maxtime?: any
        minTime?: any
        mintime?: any
        price?: any
        [key: string]: any
    }
    motoboy?: {
        name?: string
        [key: string]: any
    }
    customer?: {
        phone?: string
        name?: string
        [key: string]: any
    }
    products?: Array<{
        name?: string
        price?: number
        quantity?: number
        orderCustoms?: Array<{
            type?: string
            title?: string
            choices?: Array<{
                quantity?: number
                title?: string
                [key: string]: any
            }>
            [key: string]: any
        }>
        [key: string]: any
    }>
    createdAt?: {
        iso?: string
        [key: string]: any
    }
    isScheduled?: boolean
    [key: string]: any
}

async function extractOrdersSummary() {
    const ordersPath = resolve(__dirname, '../data/orders.json')
    const outputPath = resolve(__dirname, '../data/orders_summary.json')

    console.log('📖 Reading orders from:', ordersPath)
    console.log('📝 Writing summary to:', outputPath)
    console.log('')

    let processedOrders = 0
    let isFirst = true
    let buffer = ''
    let insideArray = false

    const writeStream = createWriteStream(outputPath)
    writeStream.write('[\n')

    const readStream = createReadStream(ordersPath, {
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
                        const order: Order = JSON.parse(objectStr)

                        const summary = {
                            id: order.id,
                            totalPrice: order.totalPrice,
                            status: order.status ?? null,
                            payment: {
                                type: order.payment?.type ?? null,
                                online: order.payment?.online ?? null,
                                total: order.payment?.total ?? null,
                            },
                            delivery: {
                                type: order.delivery?.type ?? null,
                                maxTime: (order.delivery?.maxTime ?? order.delivery?.maxtime) ?? null,
                                minTime: (order.delivery?.minTime ?? order.delivery?.mintime) ?? null,
                                price: order.delivery?.price ?? null,
                            },
                            motoboy: {
                                name: order.motoboy?.name ?? null,
                            },
                            customer: {
                                phone: order.customer?.phone ?? null,
                                name: order.customer?.name ?? null,
                            },
                            products: Array.isArray(order.products)
                                ? order.products.map((p: any) => ({
                                    name: p?.name ?? null,
                                    price: p?.price ?? null,
                                    quantity: p?.quantity ?? null,
                                    orderCustoms: Array.isArray(p?.orderCustoms)
                                        ? p.orderCustoms
                                            .map((oc: any) => {
                                                const filteredChoices = Array.isArray(oc?.choices)
                                                    ? oc.choices
                                                        .filter((choice: any) => (choice?.quantity ?? 0) > 0)
                                                        .map((choice: any) => ({
                                                            quantity: choice?.quantity ?? null,
                                                            title: choice?.title ?? null,
                                                        }))
                                                    : null

                                                return {
                                                    type: oc?.type ?? null,
                                                    title: oc?.title ?? null,
                                                    choices: filteredChoices,
                                                }
                                            })
                                            .filter((oc: any) => oc.choices && oc.choices.length > 0)
                                        : null,
                                }))
                                : null,
                            createdAt: {
                                iso: order.createdAt?.iso ?? null,
                            },
                            isScheduled: order.isScheduled ?? null,
                        }

                        if (!isFirst) {
                            writeStream.write(',\n')
                        }
                        writeStream.write('  ' + JSON.stringify(summary))
                        isFirst = false
                        processedOrders++

                        if (processedOrders % 10000 === 0) {
                            console.log(`✅ Processed ${processedOrders.toLocaleString()} orders...`)
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
        console.log(`🎉 Complete! ${processedOrders.toLocaleString()} orders processed`)
        console.log(`📁 Output file: data/orders_summary.json`)
    })

    readStream.on('error', (err: Error) => {
        console.error('❌ Error:', err)
        process.exit(1)
    })
}

extractOrdersSummary().catch(console.error)
