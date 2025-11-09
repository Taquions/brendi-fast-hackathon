import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'

function getStoreFilePath(): string {
    const cwd = process.cwd()

    const pathsToTry = [
        resolve(cwd, 'data/store.json'),
        resolve(cwd, '../../data/store.json'),
    ]

    for (const path of pathsToTry) {
        if (existsSync(path)) {
            return path
        }
    }

    return resolve(cwd, 'data/store.json')
}

const STORE_FILE_PATH = getStoreFilePath()

export interface StoreInfo {
    name: string
    brand: {
        name: string
    }
    address: {
        street: string
        number: string
        neighborhood: string
        city: string
        state: string
        zipcode: string
    }
    owner: {
        name: string
        email: string
        phoneNumber: string
    }
    companyDocument: {
        name: string
        cnpj: string
    }
    logo?: string
    status: {
        title: string
    }
    workingHours?: {
        mon?: Array<{ start: number; end: number }>
        tue?: Array<{ start: number; end: number }>
        wed?: Array<{ start: number; end: number }>
        thu?: Array<{ start: number; end: number }>
        fri?: Array<{ start: number; end: number }>
        sat?: Array<{ start: number; end: number }>
        sun?: Array<{ start: number; end: number }>
    }
}

export async function getStoreInfo(): Promise<StoreInfo> {
    try {
        const raw = await readFile(STORE_FILE_PATH, 'utf8')
        const data = JSON.parse(raw) as any

        return {
            name: data.name,
            brand: data.brand,
            address: data.address,
            owner: data.owner,
            companyDocument: data.companyDocument,
            logo: data.logo,
            status: data.status,
            workingHours: data.workingHours,
        }
    } catch (error) {
        throw new Error(`Failed to load store information: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

