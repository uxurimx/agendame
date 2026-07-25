"use client";

import { X } from "lucide-react";

interface ReferenceImageModalProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

export function ReferenceImageModal({ imageUrl, title = "Imagen de referencia", onClose }: ReferenceImageModalProps) {
  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="ref-image-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ref-image-head">
          <h3>{title}</h3>
          <button type="button" className="ov-modal-close ov-icon-button" onClick={onClose} title="Cerrar">
            <X size={16} />
          </button>
        </div>
        <img src={imageUrl} alt={title} className="ref-image-preview" />
      </div>
    </div>
  );
}
