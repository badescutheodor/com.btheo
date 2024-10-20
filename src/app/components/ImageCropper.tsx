import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

interface ImageCropperProps {
  imageSrc: string;
  crop: Crop;
  setCrop: React.Dispatch<React.SetStateAction<Crop>>;
  onCompletedCrop: (crop: PixelCrop) => void;
  setImageRef: (ref: HTMLImageElement | null) => void;
  maxWidth: number;
  maxHeight: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  crop,
  setCrop,
  onCompletedCrop,
  setImageRef,
  maxWidth,
  maxHeight,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [imgWidth, setImgWidth] = useState<number>(0);
  const [imgHeight, setImgHeight] = useState<number>(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const updateCropFromZoomPan = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      const container = containerRef.current;
      const image = imageRef.current;

      const containerRect = container.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();

      const scaleX = image.naturalWidth / imageRect.width;
      const scaleY = image.naturalHeight / imageRect.height;

      const cropX = Math.max(0, -imageRect.left + containerRect.left) * scaleX;
      const cropY = Math.max(0, -imageRect.top + containerRect.top) * scaleY;
      const cropWidth =
        Math.min(containerRect.width, imageRect.right - containerRect.left) *
        scaleX;
      const cropHeight =
        Math.min(containerRect.height, imageRect.bottom - containerRect.top) *
        scaleY;

      setCrop({
        unit: "px",
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }, [setCrop]);

  const handleZoom = useCallback(
    (delta: number, clientX: number, clientY: number) => {
      setZoom((prevZoom) => {
        const newZoom = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, prevZoom + delta)
        );

        if (imageRef.current && containerRef.current) {
          const container = containerRef.current;
          const image = imageRef.current;
          const containerRect = container.getBoundingClientRect();
          const imageRect = image.getBoundingClientRect();

          const relativeX =
            (clientX - containerRect.left) / containerRect.width;
          const relativeY =
            (clientY - containerRect.top) / containerRect.height;

          const imageCenterX = pan.x + imageRect.width / 2;
          const imageCenterY = pan.y + imageRect.height / 2;

          const scaleFactor = newZoom / prevZoom;
          const newPanX = imageCenterX + (pan.x - imageCenterX) * scaleFactor;
          const newPanY = imageCenterY + (pan.y - imageCenterY) * scaleFactor;

          setPan({ x: newPanX, y: newPanY });
        }

        return newZoom;
      });
    },
    [pan]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      handleZoom(delta, e.clientX, e.clientY);
    },
    [handleZoom]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const newPanX = e.clientX - dragStart.x;
      const newPanY = e.clientY - dragStart.y;
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  useEffect(() => {
    updateCropFromZoomPan();
  }, [zoom, pan, updateCropFromZoomPan]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setImgWidth(width);
      setImgHeight(height);
      const initialCrop = centerAspectCrop(width, height, 1);
      setCrop(initialCrop);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [setCrop]
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "400px",
        overflow: "hidden",
        background: "var(--gray-500)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ReactCrop
        crop={crop}
        onChange={(_, percentCrop) => setCrop(percentCrop)}
        onComplete={(c) => onCompletedCrop(c)}
        aspect={1}
        minWidth={30}
      >
        <img
          ref={(ref) => {
            imageRef.current = ref;
            setImageRef(ref);
          }}
          alt="Crop me"
          src={imageSrc}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "top left",
            maxWidth: "none",
            maxHeight: "none",
            pointerEvents: "none",
          }}
          onLoad={onImageLoad}
          draggable="false"
        />
      </ReactCrop>
    </div>
  );
};

export default ImageCropper;
