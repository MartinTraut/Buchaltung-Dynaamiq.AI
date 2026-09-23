/**
 * File System Access API — von TypeScripts `lib.dom` noch nicht abgedeckt.
 *
 * Nur die Teile, die `lib/auto-backup.ts` wirklich benutzt. Bewusst keine
 * vollständige Nachbildung: Was hier steht, muss stimmen, und jede zusätzlich
 * deklarierte Methode wäre ein Versprechen, das niemand geprüft hat.
 */

type FileSystemPermissionState = "granted" | "denied" | "prompt"

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite"
}

interface FileSystemHandle {
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<FileSystemPermissionState>
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<FileSystemPermissionState>
}

interface FileSystemDirectoryHandle {
  keys(): AsyncIterableIterator<string>
}

interface DirectoryPickerOptions {
  /** Merkt sich je Kennung den zuletzt gewählten Ort. */
  id?: string
  mode?: "read" | "readwrite"
  startIn?:
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos"
    | FileSystemHandle
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
