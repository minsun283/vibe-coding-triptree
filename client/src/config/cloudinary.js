const cloudinaryEnv = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ?? '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ?? '',
  folder: import.meta.env.VITE_CLOUDINARY_FOLDER?.trim() ?? '',
}

export const CLOUDINARY_ENV_KEYS = {
  cloudName: 'VITE_CLOUDINARY_CLOUD_NAME',
  uploadPreset: 'VITE_CLOUDINARY_UPLOAD_PRESET',
  folder: 'VITE_CLOUDINARY_FOLDER',
}

export function getMissingCloudinaryEnvKeys() {
  const missing = []

  if (!cloudinaryEnv.cloudName) {
    missing.push(CLOUDINARY_ENV_KEYS.cloudName)
  }

  if (!cloudinaryEnv.uploadPreset) {
    missing.push(CLOUDINARY_ENV_KEYS.uploadPreset)
  }

  return missing
}

export function isCloudinaryConfigured() {
  return getMissingCloudinaryEnvKeys().length === 0
}

export function getCloudinaryConfigMessage() {
  const missing = getMissingCloudinaryEnvKeys()

  if (missing.length === 0) {
    return ''
  }

  return `${missing.join(', ')} 환경 변수를 client/.env에 설정해 주세요.`
}

export function getCloudinaryWidgetOptions() {
  const options = {
    cloudName: cloudinaryEnv.cloudName,
    uploadPreset: cloudinaryEnv.uploadPreset,
    sources: ['local', 'url', 'camera'],
    multiple: false,
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxFileSize: 5000000,
  }

  if (cloudinaryEnv.folder) {
    options.folder = cloudinaryEnv.folder
  }

  return options
}

export default cloudinaryEnv
