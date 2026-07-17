import { ImagePlus, X } from 'lucide-react'

function ProductImageField({
  label,
  imageUrl,
  onRemove,
  openWidget,
  isReady,
  isConfigured,
  configMessage,
  loadError,
}) {
  return (
    <div className="product-create-field product-create-field--full">
      <label>{label}</label>
      <div className="product-create-image">
        {imageUrl ? (
          <div className="product-create-image__preview-wrap">
            <img
              src={imageUrl}
              alt={`${label} 미리보기`}
              className="product-create-image__preview"
            />
            <button
              type="button"
              className="product-create-image__remove"
              onClick={onRemove}
              aria-label={`${label} 삭제`}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="product-create-image__placeholder">
            <ImagePlus size={28} />
            <p>Cloudinary로 {label}를 업로드해 주세요.</p>
          </div>
        )}

        <div className="product-create-image__actions">
          <button
            type="button"
            className="product-create-btn product-create-btn--secondary product-create-image__upload-btn"
            onClick={openWidget}
            disabled={!isConfigured || !isReady}
          >
            {imageUrl ? `${label} 변경` : `${label} 업로드`}
          </button>
        </div>

        {!isConfigured && (
          <p className="product-create-image__hint product-create-image__hint--error">
            {configMessage}
          </p>
        )}

        {loadError && isConfigured && (
          <p className="product-create-image__hint product-create-image__hint--error">
            {loadError}
          </p>
        )}
      </div>
    </div>
  )
}

export default ProductImageField
