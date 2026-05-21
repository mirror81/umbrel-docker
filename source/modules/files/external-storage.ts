import nodePath from 'node:path'
import {setTimeout} from 'node:timers/promises'

import pRetry from 'p-retry'
import pWaitFor from 'p-wait-for'

import fse from 'fs-extra'
import {$} from 'execa'
import PQueue from 'p-queue'

import {isRaspberryPi} from '../system/system.js'

import type Umbreld from '../../index.js'

type BlockDevice = {
	id: string
	name: string
	// Type more values here as we use them like emmc or sdcard
	transport: 'unknown' | 'usb' | 'nvme'
	size: number
	isMounted: boolean
	isFormatting: boolean
	partitions: {
		id: string
		type: string
		size: number
		mountpoints: string[]
		label: string
	}[]
}

// Get block devices — stub for Docker
export async function getBlockDevices() {
	return []
}

export default class ExternalStorage {
	#umbreld: Umbreld
	logger: Umbreld['logger']
	#mountQueue = new PQueue({concurrency: 1})
	#removeDeviceChangeListener?: () => void
	formatJobs: Set<string> = new Set()

	constructor(umbreld: Umbreld) {
		this.#umbreld = umbreld
		const {name} = this.constructor
		this.logger = umbreld.logger.createChildLogger(`files:${name.toLocaleLowerCase()}`)
	}

	// Only enable this module on non raspberry pi devices.
	// We disable on Pi due to unreliable power issues when running USB storage devices
	// and also due to complexities with the current mount script.
	async supported() {
		return false
	}

	// Add listener
	async start() {
		return
	}

	// Remove listener
	async stop() {
		return
	}

	// Mount external disks
	async #mountExternalDevices() {
        return
	}

	// Unmount partition from external disk
	async unmountExternalDevice(deviceId: string, {remove = true} = {}) {
        return
	}

	// Format external device
	async formatExternalDevice({
		deviceId,
		filesystem,
		label,
	}: {
		deviceId: string
		filesystem: 'ext4' | 'exfat'
		label: string
	}) {
        throw new Error('External storage is not supported in Docker')
	}

	// Get external devices
	async #getExternalDevices() {
        return []
	}

	// Get disks used by the running system so they are never treated as external storage.
	async #getSystemDiskIds(blockDevices: BlockDevice[]) {
		const systemDiskIds = new Set<string>()
		const systemPaths = [this.#umbreld.dataDirectory, '/']

		for (const blockDevice of blockDevices) {
			for (const partition of blockDevice.partitions) {
				const hasSystemMount = partition.mountpoints.some((mountpoint) =>
					systemPaths.some((systemPath) => this.#isPathOnMountpoint(systemPath, mountpoint)),
				)
				if (hasSystemMount) systemDiskIds.add(blockDevice.id)
			}
		}

		for (const systemPath of systemPaths) {
			const source = await this.#getFilesystemSource(systemPath)
			const diskId = this.#getDiskIdForDeviceSource(source, blockDevices)
			if (diskId) systemDiskIds.add(diskId)
		}

		return systemDiskIds
	}

	async #getFilesystemSource(systemPath: string) {
		try {
			const {stdout} = await $`df ${systemPath} --output=source`
			return stdout
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean)
				.pop()
		} catch {
			return undefined
		}
	}

	#getDiskIdForDeviceSource(source: string | undefined, blockDevices: BlockDevice[]) {
		if (!source?.startsWith('/dev/')) return undefined

		const deviceId = source.split('/').pop()
		if (!deviceId) return undefined

		for (const blockDevice of blockDevices) {
			if (blockDevice.id === deviceId) return blockDevice.id
			if (blockDevice.partitions.some((partition) => partition.id === deviceId)) return blockDevice.id
		}

		return undefined
	}

	#isPathOnMountpoint(systemPath: string, mountpoint: string) {
		const normalisedSystemPath = nodePath.resolve(systemPath)
		const normalisedMountpoint = nodePath.resolve(mountpoint)

		return (
			normalisedSystemPath === normalisedMountpoint ||
			normalisedSystemPath.startsWith(`${normalisedMountpoint}${nodePath.sep}`)
		)
	}

	// Get external devices but only show mount points that are under /External
	// Also decorate with useful flags like isMounted and isFormatting
	async getExternalDevicesWithVirtualMountPoints() {
		return []
	}

	// Get all umbreld mounted external devices
	async getMountedExternalDevices() {
		return []
	}

	// Unmount all mounted external devices
	async #unmountAllMountedExternalDevices() {
		return
	}

	// Clean left over mount points
	async #cleanLeftOverMountPoints() {
		return
	}

	// Check if an external drive is connected on unsupported hardware
	// This is used to notify unsupported users why they can't see their hardware.
	async isExternalDeviceConnectedOnUnsupportedDevice() {
		return false
	}
}
